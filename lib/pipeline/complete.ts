import { DEFAULT_SEASON } from "@/config/compelling-savings";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";
import {
  EditorialTimeoutError,
  editorialQualityIssues,
  isNonRetryableWritingError,
  reuseSavedWriting,
  writeReportCopy,
} from "@/lib/copy/editorial";
import type { ReportWriting } from "@/lib/copy/writing-schema";
import { parseResearch, type CanonicalResearch } from "@/lib/research/schema";
import { applySavingsIntegrity } from "@/lib/research/savings-integrity";
import { freeScanLeakFlags, researchToReportData } from "@/lib/research/to-report";
import { summarizeDisplaySavings } from "@/lib/research/display-savings";
import { buildSavingsPlanCheckoutUrl } from "@/lib/stripe/checkout";
import { generateReportPdfBuffer } from "@/reports/generate-pdf-buffer";
import { downloadDriveFile, ensureCustomerFolder, upsertDrivePdf } from "@/lib/google/drive";
import { familyMountains } from "@/lib/copy/reports";
import { upsertGmailDraft } from "@/lib/google/gmail";
import { countPdfPages } from "@/lib/google/pdf-pages";
import { assertDraftCopySafe, buildInitialDraftEmail, initialDraftAttachmentKind } from "@/lib/copy/emails";
import { assertSameCustomer } from "@/lib/identity";
import { addPipelineLog } from "@/lib/db/settings";
import type { CustomerReport } from "@/lib/db/schema";
import {
  claimGenerationJob,
  getReportById,
  markError,
  releaseGenerationJob,
  updateReport,
} from "./store";
import {
  JobInProgressError,
  SentReportRefreshError,
  artifactStatus,
  writingFingerprint,
} from "./artifacts";
import type { OfferMode, PipelineStatus } from "./status";
import { hasPurchased } from "./status";
import { decideSentArtifactRefresh, SENT_ARTIFACT_REFRESH_MESSAGE } from "@/lib/pipeline/admin-queue";

async function syncOfferDecision(reportId: string) {
  const report = await requireReport(reportId);
  const research = parseStoredResearch(report);
  const display = summarizeDisplaySavings(research);
  const decision = display.offer;
  const checkoutUrl = decision.offerMode === "SCAN_UPSELL" ? buildCheckout(report) : null;
  const sent = report.initialReportSentAt != null;
  const updated = await updateReport(report.id, {
    offerMode: decision.offerMode,
    offerModeReason: decision.reason,
    stripeCheckoutUrl: checkoutUrl,
    stripeClientReferenceId: report.id,
    ...(sent
      ? {}
      : {
          researchJson: research,
          coreSavingsLow: display.firmLow,
          coreSavingsHigh: display.firmHigh,
          optionalSavingsLow: display.conditionalLow,
          optionalSavingsHigh: display.conditionalHigh,
        }),
  });
  return {
    report: updated,
    research,
    display,
    offerMode: decision.offerMode,
    checkoutUrl,
  };
}

function demoteStaleDeliveryStatus(status: string): PipelineStatus | undefined {
  if (status === "GMAIL_DRAFT_READY" || status === "FREE_PLAN_READY" || status === "PDFS_READY") {
    return "RESEARCH_COMPLETE";
  }
  if (status === "WRITING" || status === "WRITING_FAILED") return "RESEARCH_COMPLETE";
  return undefined;
}

export async function persistValidatedWriting(options: {
  reportId: string;
  writing: ReportWriting;
  openaiResponseId: string | null;
  offerMode: OfferMode;
  source: "saved" | "generated";
  status?: PipelineStatus;
}): Promise<CustomerReport> {
  const report = await requireReport(options.reportId);
  const fingerprint = writingFingerprint({
    openaiResponseId: options.openaiResponseId,
    offerMode: options.offerMode,
  });
  const nextStatus = options.status ?? demoteStaleDeliveryStatus(report.status) ?? report.status;
  const updated = await updateReport(options.reportId, {
    status: nextStatus,
    writingJson: options.writing,
    writingFingerprint: fingerprint,
    writingCompletedAt: new Date(),
    lastError: null,
  });
  await addPipelineLog(
    options.reportId,
    nextStatus,
    options.source === "saved"
      ? `Reused saved editorial copy (${fingerprint})`
      : `Generated editorial copy (${fingerprint})`,
  );
  return updated;
}

export async function storeCompletedResearch(options: {
  reportId: string;
  research: CanonicalResearch;
  openaiResponseId: string;
}): Promise<CustomerReport> {
  const research = applySavingsIntegrity(options.research);
  const display = summarizeDisplaySavings(research);
  const decision = display.offer;
  const checkoutUrl =
    decision.offerMode === "SCAN_UPSELL" ? await checkoutUrlFor(options.reportId) : null;

  const updated = await updateReport(options.reportId, {
    status: "RESEARCH_COMPLETE",
    researchJson: research,
    openaiResponseId: options.openaiResponseId,
    coreSavingsLow: display.firmLow,
    coreSavingsHigh: display.firmHigh,
    optionalSavingsLow: display.conditionalLow,
    optionalSavingsHigh: display.conditionalHigh,
    confidence: research.summary.confidence,
    humanReviewFlags: [
      ...research.summary.humanReviewFlags,
      ...freeScanFlags(research, options.reportId, decision.offerMode, checkoutUrl),
    ],
    offerMode: decision.offerMode,
    offerModeReason: decision.reason,
    stripeCheckoutUrl: checkoutUrl,
    stripeClientReferenceId: options.reportId,
    researchCompletedAt: new Date(),
    writingJson: null,
    writingFingerprint: null,
    writingCompletedAt: null,
    pdfsFingerprint: null,
    draftFingerprint: null,
    jobKind: null,
    jobStartedAt: null,
    lastError: null,
  });

  await addPipelineLog(options.reportId, "RESEARCH_COMPLETE", decision.reason);
  log.info("research_completed", {
    reportId: options.reportId,
    offerMode: decision.offerMode,
    firmCoreSavingsLow: decision.coreSavingsLow,
    headlineCoreSavingsLow: display.firmLow,
    confidence: research.summary.confidence,
  });
  log.info("offer_mode_selected", {
    reportId: options.reportId,
    offerMode: decision.offerMode,
    reason: decision.reason,
  });
  return updated;
}

export async function recalculateOfferMode(reportId: string): Promise<CustomerReport> {
  const synced = await syncOfferDecision(reportId);
  return synced.report;
}

async function withGenerationJob<T>(
  reportId: string,
  kind: string,
  fn: (report: CustomerReport) => Promise<T>,
): Promise<T> {
  const claimed = await claimGenerationJob(reportId, kind);
  if ("conflict" in claimed) {
    throw new JobInProgressError(
      `A ${claimed.report.jobKind ?? kind} job is already running for this report`,
    );
  }
  if (claimed.recoveredStale) {
    await addPipelineLog(
      reportId,
      claimed.report.status,
      `Recovered stale ${kind} job and started a new one`,
    );
  }
  try {
    return await fn(claimed.report);
  } finally {
    await releaseGenerationJob(reportId, kind);
  }
}

export async function ensureCurrentWriting(
  reportId: string,
  writingOverride?: ReportWriting,
): Promise<{
  report: CustomerReport;
  research: CanonicalResearch;
  offerMode: OfferMode;
  checkoutUrl: string | null;
  display: ReturnType<typeof summarizeDisplaySavings>;
  writing: ReportWriting;
  reused: boolean;
}> {
  const synced = await syncOfferDecision(reportId);
  const { research, offerMode, checkoutUrl, display } = synced;
  let report = synced.report;
  const expected = writingFingerprint({
    openaiResponseId: report.openaiResponseId,
    offerMode,
  });

  const persist = async (writing: ReportWriting, source: "saved" | "generated", status?: PipelineStatus) => {
    report = await persistValidatedWriting({
      reportId,
      writing,
      openaiResponseId: report.openaiResponseId,
      offerMode,
      source,
      status,
    });
    return writing;
  };

  if (writingOverride) {
    const issues = editorialQualityIssues({ writing: writingOverride, research, offerMode });
    if (issues.length > 0) {
      const error = new Error(`Saved editorial copy failed validation: ${issues.join("; ")}`);
      await markError(reportId, "WRITING_FAILED", error);
      throw error;
    }
    await persist(writingOverride, "saved");
    return {
      report: await requireReport(reportId),
      research,
      offerMode,
      checkoutUrl,
      display,
      writing: writingOverride,
      reused: true,
    };
  }

  try {
    const reused = reuseSavedWriting({
      stored: report.writingJson,
      research,
      offerMode,
    });
    if (reused) {
      await persist(reused, "saved");
      log.info("editorial_reused", { reportId, fingerprint: expected });
      return {
        report: await requireReport(reportId),
        research,
        offerMode,
        checkoutUrl,
        display,
        writing: reused,
        reused: true,
      };
    }
  } catch (error) {
    if (isNonRetryableWritingError(error)) {
      log.error("writing_failed", {
        reportId,
        error: error instanceof Error ? error.message : String(error),
      });
      await markError(reportId, "WRITING_FAILED", error);
      throw error;
    }
    throw error;
  }

  await updateReport(reportId, {
    status: "WRITING",
    lastError: null,
  });
  await addPipelineLog(reportId, "WRITING", "Writing Scan, Plan, and email copy from saved research");

  try {
    const writing = await writeReportCopy({ research, offerMode });
    await persist(writing, "generated");
    return {
      report: await requireReport(reportId),
      research,
      offerMode,
      checkoutUrl,
      display,
      writing,
      reused: false,
    };
  } catch (error) {
    const message =
      error instanceof EditorialTimeoutError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    log.error("writing_failed", { reportId, error: message });
    await markError(reportId, "WRITING_FAILED", error);
    throw error;
  }
}

export async function generateAndUploadPdfs(
  reportId: string,
  writingOverride?: ReportWriting,
  options?: { confirmReplaceSent?: boolean },
): Promise<CustomerReport> {
  const existing = await requireReport(reportId);
  const sentDecision = decideSentArtifactRefresh(existing, {
    confirmReplaceSent: options?.confirmReplaceSent,
    mode: "explicit",
  });
  if (sentDecision.action !== "allow") {
    throw new SentReportRefreshError(
      sentDecision.action === "confirm" ? sentDecision.message : SENT_ARTIFACT_REFRESH_MESSAGE,
    );
  }
  return withGenerationJob(reportId, "pdfs", async () => {
    const ensured = await ensureCurrentWriting(reportId, writingOverride);
    const { research, offerMode, checkoutUrl, writing, report } = ensured;
    const fingerprint = writingFingerprint({
      openaiResponseId: report.openaiResponseId,
      offerMode,
    });

    await updateReport(reportId, {
      status: "PDF_GENERATING",
      pdfStartedAt: new Date(),
    });
    await addPipelineLog(reportId, "PDF_GENERATING", "Generating Savings Scan and Savings Plan PDFs");
    try {
      const data = researchToReportData({
        research,
        reportId,
        offerMode,
        checkoutUrl,
        season: DEFAULT_SEASON,
        writing,
      });

      const scan = await generateReportPdfBuffer({ data, type: "free" });
      const plan = await generateReportPdfBuffer({ data, type: "full" });

      log.info("pdf_generated", { reportId, scan: scan.filename, plan: plan.filename });

      const folderId = await ensureCustomerFolder({
        submittedAt: report.submittedAt,
        firstName: report.firstName || research.family.firstName,
        email: report.email || "",
        internalId: reportId,
        existingFolderId: report.driveFolderId,
      });

      const scanName = `Savings Scan - ${research.family.firstName}.pdf`;
      const planName = `Savings Plan - ${research.family.firstName}.pdf`;

      const scanFileId = await upsertDrivePdf({
        folderId,
        filename: scanName,
        bytes: scan.bytes,
        existingFileId: report.driveScanFileId,
      });
      const planFileId = await upsertDrivePdf({
        folderId,
        filename: planName,
        bytes: plan.bytes,
        existingFileId: report.drivePlanFileId,
      });

      const updated = await updateReport(reportId, {
        status: "PDFS_READY",
        driveFolderId: folderId,
        driveScanFileId: scanFileId,
        drivePlanFileId: planFileId,
        scanFilename: scanName,
        planFilename: planName,
        pdfsReadyAt: new Date(),
        pdfsFingerprint: fingerprint,
        lastError: null,
      });
      await addPipelineLog(reportId, "PDFS_READY", "Both PDFs uploaded to Drive");
      log.info("drive_uploaded", { reportId, folderId, scanFileId, planFileId });
      return updated;
    } catch (error) {
      log.error("pdf_failed", { reportId, error: error instanceof Error ? error.message : String(error) });
      await markError(reportId, "PDF_FAILED", error);
      throw error;
    }
  });
}

function loadSavedWritingForDraft(
  report: CustomerReport,
  research: CanonicalResearch,
  offerMode: OfferMode,
): ReportWriting {
  const artifacts = artifactStatus(report);
  const reused = reuseSavedWriting({ stored: report.writingJson, research, offerMode });
  if (artifacts.writing === "current" && reused) return reused;
  throw new Error("Saved editorial copy is missing or stale. Generate PDFs first so writing is persisted.");
}

export async function createInitialGmailDraft(
  reportId: string,
  writingOverride?: ReportWriting,
  options?: { confirmReplaceSent?: boolean },
): Promise<CustomerReport> {
  const existing = await requireReport(reportId);
  const sentDecision = decideSentArtifactRefresh(existing, {
    confirmReplaceSent: options?.confirmReplaceSent,
    mode: "explicit",
  });
  if (sentDecision.action !== "allow") {
    throw new SentReportRefreshError(
      sentDecision.action === "confirm" ? sentDecision.message : SENT_ARTIFACT_REFRESH_MESSAGE,
    );
  }
  return withGenerationJob(reportId, "draft", async () => {
    const synced = await syncOfferDecision(reportId);
    const { research, offerMode, checkoutUrl, display, report } = synced;
    if (hasPurchased(report.status as never) && report.gmailPaidMessageId) {
      await addPipelineLog(
        reportId,
        report.status,
        "Skipped draft recreate because the paid plan was already delivered",
      );
      return report;
    }

    const identity = assertSameCustomer({
      internalId: report.id,
      email: report.email,
      planReportId: report.id,
      planCustomerEmail: report.email,
    });
    if (!identity.ok || !report.email) {
      await markError(reportId, "DRAFT_FAILED", identity.mismatches.join("; ") || "Missing customer email");
      throw new Error(identity.mismatches.join("; ") || "Missing customer email");
    }

    const artifacts = artifactStatus(report);
    if (artifacts.pdfs !== "current") {
      throw new Error("Current PDFs are missing or stale. Generate PDFs from the current editorial copy first.");
    }
    if (offerMode === "SCAN_UPSELL" && !report.driveScanFileId) {
      throw new Error("Savings Scan PDF is missing");
    }
    if (offerMode === "FULL_PLAN_FREE" && !report.drivePlanFileId) {
      throw new Error("Savings Plan PDF is missing");
    }

    const writing = writingOverride ?? loadSavedWritingForDraft(report, research, offerMode);
    const fingerprint = writingFingerprint({
      openaiResponseId: report.openaiResponseId,
      offerMode,
    });

    let planPageCount: number | null = null;
    if (offerMode === "SCAN_UPSELL" && report.drivePlanFileId) {
      try {
        const planBytes = await downloadDriveFile(report.drivePlanFileId);
        planPageCount = countPdfPages(planBytes);
      } catch {
        planPageCount = null;
      }
    }

    const email = buildInitialDraftEmail({
      firstName: report.firstName || research.family.firstName,
      offerMode,
      savingsRange: display.firmLow > 0 ? display.headlineSavings : "",
      checkoutUrl,
      coreSavingsLow: display.firmLow,
      mountains: familyMountains(research),
      findings: writing?.scan.findings.map((finding) => finding.heading) ?? [],
      planPageCount,
    });

    const copyIssues = assertDraftCopySafe({
      offerMode,
      body: email.body,
      html: email.html,
      checkoutUrl,
    });
    if (copyIssues.length > 0) {
      await markError(reportId, "DRAFT_FAILED", copyIssues.join("; "));
      throw new Error(copyIssues.join("; "));
    }

    try {
      const kind = initialDraftAttachmentKind(offerMode);
      const attachmentId = kind === "scan" ? report.driveScanFileId : report.drivePlanFileId;
      const filename = kind === "scan" ? report.scanFilename : report.planFilename;
      if (!attachmentId || !filename) throw new Error("PDF attachment is missing");
      const bytes = await downloadDriveFile(attachmentId);

      const draftId = await upsertGmailDraft({
        existingDraftId: report.gmailDraftId,
        to: report.email,
        subject: email.subject,
        body: email.body,
        html: email.html,
        attachments: [{ filename, contentType: "application/pdf", bytes }],
      });

      const status = offerMode === "FULL_PLAN_FREE" ? "FREE_PLAN_READY" : "GMAIL_DRAFT_READY";
      const updated = await updateReport(reportId, {
        status,
        gmailDraftId: draftId,
        draftReadyAt: new Date(),
        draftFingerprint: fingerprint,
        lastError: null,
      });
      await addPipelineLog(reportId, status, `Gmail draft ${draftId} created (${offerMode})`);
      log.info("gmail_draft_created", { reportId, offerMode, draftId });
      return updated;
    } catch (error) {
      log.error("draft_failed", { reportId, error: error instanceof Error ? error.message : String(error) });
      await markError(reportId, "DRAFT_FAILED", error);
      throw error;
    }
  });
}

export async function continueAfterResearch(reportId: string): Promise<void> {
  const report = await requireReport(reportId);
  const sentDecision = decideSentArtifactRefresh(report, { mode: "auto" });
  if (sentDecision.action === "skip") {
    await addPipelineLog(
      reportId,
      report.status,
      "Skipped PDF and draft refresh because the initial report was already marked sent",
    );
    return;
  }
  await generateAndUploadPdfs(reportId);
  await createInitialGmailDraft(reportId);
}

function freeScanFlags(
  research: CanonicalResearch,
  reportId: string,
  offerMode: OfferMode,
  checkoutUrl: string | null,
): string[] {
  const data = researchToReportData({ research, reportId, offerMode, checkoutUrl });
  return freeScanLeakFlags(data);
}

async function checkoutUrlFor(reportId: string): Promise<string | null> {
  const report = await getReportById(reportId);
  if (!report?.email) return null;
  return buildSavingsPlanCheckoutUrl({
    paymentLink: env.stripePaymentLink(),
    internalId: reportId,
    email: report.email,
  });
}

function buildCheckout(report: CustomerReport): string | null {
  if (!report.email) return report.stripeCheckoutUrl;
  return buildSavingsPlanCheckoutUrl({
    paymentLink: env.stripePaymentLink(),
    internalId: report.id,
    email: report.email,
  });
}

function parseStoredResearch(report: CustomerReport): CanonicalResearch {
  if (!report.researchJson) throw new Error("Research JSON is missing");
  return applySavingsIntegrity(parseResearch(report.researchJson));
}

async function requireReport(reportId: string): Promise<CustomerReport> {
  const report = await getReportById(reportId);
  if (!report) throw new Error(`Report ${reportId} not found`);
  return report;
}
