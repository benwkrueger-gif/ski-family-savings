import { DEFAULT_SEASON } from "@/config/compelling-savings";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";
import { writeReportCopy } from "@/lib/copy/editorial";
import type { ReportWriting } from "@/lib/copy/writing-schema";
import { parseResearch, type CanonicalResearch } from "@/lib/research/schema";
import { freeScanLeakFlags, researchToReportData } from "@/lib/research/to-report";
import { summarizeDisplaySavings } from "@/lib/research/display-savings";
import { buildSavingsPlanCheckoutUrl } from "@/lib/stripe/checkout";
import { generateReportPdfBuffer } from "@/reports/generate-pdf-buffer";
import { ensureCustomerFolder, upsertDrivePdf } from "@/lib/google/drive";
import { upsertGmailDraft } from "@/lib/google/gmail";
import { assertDraftCopySafe, buildInitialDraftEmail } from "@/lib/copy/emails";
import { assertSameCustomer } from "@/lib/identity";
import { addPipelineLog } from "@/lib/db/settings";
import type { CustomerReport } from "@/lib/db/schema";
import { getReportById, markError, updateReport } from "./store";
import type { OfferMode } from "./status";
import { hasPurchased } from "./status";

async function syncOfferDecision(reportId: string) {
  const report = await requireReport(reportId);
  const research = parseStoredResearch(report);
  const display = summarizeDisplaySavings(research);
  const decision = display.offer;
  const checkoutUrl = decision.offerMode === "SCAN_UPSELL" ? buildCheckout(report) : null;
  const updated = await updateReport(report.id, {
    offerMode: decision.offerMode,
    offerModeReason: decision.reason,
    stripeCheckoutUrl: checkoutUrl,
    stripeClientReferenceId: report.id,
  });
  return {
    report: updated,
    research,
    display,
    offerMode: decision.offerMode,
    checkoutUrl,
  };
}

export async function storeCompletedResearch(options: {
  reportId: string;
  research: CanonicalResearch;
  openaiResponseId: string;
}): Promise<CustomerReport> {
  const decision = summarizeDisplaySavings(options.research).offer;
  const checkoutUrl =
    decision.offerMode === "SCAN_UPSELL"
      ? await checkoutUrlFor(options.reportId)
      : null;

  const updated = await updateReport(options.reportId, {
    status: "RESEARCH_COMPLETE",
    researchJson: options.research,
    openaiResponseId: options.openaiResponseId,
    coreSavingsLow: options.research.summary.coreSavingsLow,
    coreSavingsHigh: options.research.summary.coreSavingsHigh,
    optionalSavingsLow: options.research.summary.optionalSavingsLow,
    optionalSavingsHigh: options.research.summary.optionalSavingsHigh,
    confidence: options.research.summary.confidence,
    humanReviewFlags: [
      ...options.research.summary.humanReviewFlags,
      ...freeScanFlags(options.research, options.reportId, decision.offerMode, checkoutUrl),
    ],
    offerMode: decision.offerMode,
    offerModeReason: decision.reason,
    stripeCheckoutUrl: checkoutUrl,
    stripeClientReferenceId: options.reportId,
    researchCompletedAt: new Date(),
    lastError: null,
  });

  await addPipelineLog(options.reportId, "RESEARCH_COMPLETE", decision.reason);
  log.info("research_completed", {
    reportId: options.reportId,
    offerMode: decision.offerMode,
    firmCoreSavingsLow: decision.coreSavingsLow,
    headlineCoreSavingsLow: options.research.summary.coreSavingsLow,
    confidence: options.research.summary.confidence,
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

export async function generateAndUploadPdfs(
  reportId: string,
  writingOverride?: ReportWriting,
): Promise<CustomerReport> {
  const synced = await syncOfferDecision(reportId);
  const { report, research, offerMode, checkoutUrl } = synced;
  const writing = writingOverride ?? (await writeReportCopy({ research, offerMode }));

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
}

export async function createInitialGmailDraft(
  reportId: string,
  writingOverride?: ReportWriting,
): Promise<CustomerReport> {
  const synced = await syncOfferDecision(reportId);
  const { report, research, offerMode, checkoutUrl, display } = synced;
  if (hasPurchased(report.status as never) && report.gmailPaidMessageId) {
    await addPipelineLog(reportId, report.status, "Skipped draft recreate because the paid plan was already delivered");
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

  if (offerMode === "SCAN_UPSELL" && !report.driveScanFileId) {
    throw new Error("Savings Scan PDF is missing");
  }
  if (offerMode === "FULL_PLAN_FREE" && !report.drivePlanFileId) {
    throw new Error("Savings Plan PDF is missing");
  }

  const writing = writingOverride ?? (await writeReportCopy({ research, offerMode }));

  const email = buildInitialDraftEmail({
    firstName: report.firstName || research.family.firstName,
    offerMode,
    savingsRange:
      display.firmLow > 0
        ? display.headlineSavings
        : (display.conditionalSavings ?? display.headlineSavings),
    personalizedObservation: writing?.email.observation ?? research.emailContext.personalizedObservation,
    emailOpening: writing?.email.opening,
    enthusiasmLevel: research.emailContext.enthusiasmLevel,
    checkoutUrl,
    coreSavingsLow: display.firmLow,
  });

  const copyIssues = assertDraftCopySafe({ offerMode, body: email.body, checkoutUrl });
  if (copyIssues.length > 0) {
    await markError(reportId, "DRAFT_FAILED", copyIssues.join("; "));
    throw new Error(copyIssues.join("; "));
  }

  try {
    const { downloadDriveFile } = await import("@/lib/google/drive");
    const attachmentId = offerMode === "SCAN_UPSELL" ? report.driveScanFileId : report.drivePlanFileId;
    const filename = offerMode === "SCAN_UPSELL" ? report.scanFilename : report.planFilename;
    if (!attachmentId || !filename) throw new Error("PDF attachment is missing");
    const bytes = await downloadDriveFile(attachmentId);

    const draftId = await upsertGmailDraft({
      existingDraftId: report.gmailDraftId,
      to: report.email,
      subject: email.subject,
      body: email.body,
      attachments: [{ filename, contentType: "application/pdf", bytes }],
    });

    const status = offerMode === "FULL_PLAN_FREE" ? "FREE_PLAN_READY" : "GMAIL_DRAFT_READY";
    const updated = await updateReport(reportId, {
      status,
      gmailDraftId: draftId,
      draftReadyAt: new Date(),
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
}

export async function continueAfterResearch(reportId: string): Promise<void> {
  const { research, offerMode } = await syncOfferDecision(reportId);
  const writing = await writeReportCopy({ research, offerMode });
  await generateAndUploadPdfs(reportId, writing);
  await createInitialGmailDraft(reportId, writing);
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
  return parseResearch(report.researchJson);
}

async function requireReport(reportId: string): Promise<CustomerReport> {
  const report = await getReportById(reportId);
  if (!report) throw new Error(`Report ${reportId} not found`);
  return report;
}
