import { DEFAULT_SEASON } from "@/config/compelling-savings";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";
import { decideOfferModeFromResearch } from "@/lib/research/offer-mode";
import { parseResearch, type CanonicalResearch } from "@/lib/research/schema";
import { freeScanLeakFlags, researchToReportData } from "@/lib/research/to-report";
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

export async function storeCompletedResearch(options: {
  reportId: string;
  research: CanonicalResearch;
  openaiResponseId: string;
}): Promise<CustomerReport> {
  const decision = decideOfferModeFromResearch(options.research);
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
    coreSavingsLow: options.research.summary.coreSavingsLow,
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
  const report = await requireReport(reportId);
  const research = parseStoredResearch(report);
  const decision = decideOfferModeFromResearch(research);
  const checkoutUrl =
    decision.offerMode === "SCAN_UPSELL" ? buildCheckout(report) : null;
  return updateReport(reportId, {
    offerMode: decision.offerMode,
    offerModeReason: decision.reason,
    stripeCheckoutUrl: checkoutUrl,
    stripeClientReferenceId: reportId,
  });
}

export async function generateAndUploadPdfs(reportId: string): Promise<CustomerReport> {
  const report = await requireReport(reportId);
  const research = parseStoredResearch(report);
  const offerMode = (report.offerMode as OfferMode | null) ?? "FULL_PLAN_FREE";
  const checkoutUrl = offerMode === "SCAN_UPSELL" ? buildCheckout(report) : null;

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
    });

    const [scan, plan] = await Promise.all([
      generateReportPdfBuffer({ data, type: "free" }),
      generateReportPdfBuffer({ data, type: "full" }),
    ]);

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

export async function createInitialGmailDraft(reportId: string): Promise<CustomerReport> {
  const report = await requireReport(reportId);
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

  const research = parseStoredResearch(report);
  const offerMode = (report.offerMode as OfferMode | null) ?? "FULL_PLAN_FREE";
  if (offerMode === "SCAN_UPSELL" && !report.driveScanFileId) {
    throw new Error("Savings Scan PDF is missing");
  }
  if (offerMode === "FULL_PLAN_FREE" && !report.drivePlanFileId) {
    throw new Error("Savings Plan PDF is missing");
  }

  const checkoutUrl = offerMode === "SCAN_UPSELL" ? buildCheckout(report) : null;
  const email = buildInitialDraftEmail({
    firstName: report.firstName || research.family.firstName,
    offerMode,
    savingsRange:
      research.summary.headlineSavings ||
      `$${Math.round(research.summary.coreSavingsLow)}-$${Math.round(research.summary.coreSavingsHigh)}`,
    personalizedObservation: research.emailContext.personalizedObservation,
    enthusiasmLevel: research.emailContext.enthusiasmLevel,
    checkoutUrl,
    coreSavingsLow: research.summary.coreSavingsLow,
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
  return parseResearch(report.researchJson);
}

async function requireReport(reportId: string): Promise<CustomerReport> {
  const report = await getReportById(reportId);
  if (!report) throw new Error(`Report ${reportId} not found`);
  return report;
}
