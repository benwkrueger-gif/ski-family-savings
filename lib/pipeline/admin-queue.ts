import { artifactStatus } from "@/lib/pipeline/artifacts";
import type { OfferMode } from "@/lib/pipeline/status";
import { hasPurchased } from "@/lib/pipeline/status";

export const QUEUE_VIEWS = ["todo", "sent", "all", "deleted"] as const;
export type QueueView = (typeof QUEUE_VIEWS)[number];

export type QueueReport = {
  id: string;
  firstName?: string | null;
  email?: string | null;
  status: string;
  offerMode?: string | null;
  source?: string | null;
  jobKind?: string | null;
  jobStartedAt?: Date | null;
  gmailPaidMessageId?: string | null;
  planDeliveredAt?: Date | null;
  purchasedAt?: Date | null;
  stripePaymentStatus?: string | null;
  stripeCheckoutSessionId?: string | null;
  initialReportSentAt?: Date | null;
  initialReportDeliveryType?: string | null;
  deletedAt?: Date | null;
  writingJson?: unknown;
  writingFingerprint?: string | null;
  openaiResponseId?: string | null;
  driveScanFileId?: string | null;
  drivePlanFileId?: string | null;
  pdfsReadyAt?: Date | null;
  pdfsFingerprint?: string | null;
  gmailDraftId?: string | null;
  draftReadyAt?: Date | null;
  draftFingerprint?: string | null;
};

export type MarkSentDecision =
  | { action: "skip"; reason: "deleted" | "already-paid" | "already-marked" | "not-ready" | "missing-offer-mode" }
  | { action: "mark" | "correct"; sentAt: Date; deliveryType: OfferMode };

export type UnmarkSentDecision =
  | { action: "skip"; reason: "deleted" | "not-manually-marked" | "paid-delivery" }
  | { action: "unmark" };

export type DeleteDecision =
  | { action: "skip"; reason: "already-deleted" }
  | { action: "block"; reason: "active-job" | "paid-protected" }
  | { action: "delete" };

export type RestoreDecision =
  | { action: "skip"; reason: "not-deleted" }
  | { action: "restore" };

export function parseQueueView(value: string | null | undefined): QueueView {
  return QUEUE_VIEWS.includes(value as QueueView) ? (value as QueueView) : "todo";
}

export function hasPaidDeliveryRecord(report: QueueReport): boolean {
  return (
    report.status === "PLAN_DELIVERED" ||
    report.planDeliveredAt != null ||
    Boolean(report.gmailPaidMessageId)
  );
}

export function hasManualInitialSend(report: Pick<QueueReport, "initialReportSentAt">): boolean {
  return report.initialReportSentAt != null;
}

export const SENT_ARTIFACT_REFRESH_MESSAGE =
  "This family's initial report was already marked Sent. Refreshing may replace the Drive PDFs and the saved Gmail draft. The sent timestamp, delivery type, Gmail message ID, and payment records will be kept, and no email will be sent.";

export type SentArtifactRefreshDecision =
  | { action: "allow" }
  | { action: "skip"; reason: "initial-report-sent" }
  | { action: "confirm"; reason: "initial-report-sent"; message: string };

export function decideSentArtifactRefresh(
  report: Pick<QueueReport, "initialReportSentAt">,
  options: { confirmReplaceSent?: boolean; mode: "auto" | "explicit" },
): SentArtifactRefreshDecision {
  if (!hasManualInitialSend(report)) return { action: "allow" };
  if (options.confirmReplaceSent) return { action: "allow" };
  if (options.mode === "explicit") {
    return {
      action: "confirm",
      reason: "initial-report-sent",
      message: SENT_ARTIFACT_REFRESH_MESSAGE,
    };
  }
  return { action: "skip", reason: "initial-report-sent" };
}

export function isSentInQueue(report: QueueReport): boolean {
  return hasPaidDeliveryRecord(report) || hasManualInitialSend(report);
}

export function isDeleted(report: QueueReport): boolean {
  return report.deletedAt != null;
}

export function isInternalTest(report: QueueReport): boolean {
  return report.source === "internal-test";
}

export function hasRealPayment(report: QueueReport): boolean {
  if (isInternalTest(report)) return false;
  return (
    Boolean(report.purchasedAt) ||
    report.stripePaymentStatus === "paid" ||
    hasPurchased(report.status as never) ||
    hasPaidDeliveryRecord(report)
  );
}

export function matchesQueueView(report: QueueReport, view: QueueView): boolean {
  if (view === "deleted") return isDeleted(report);
  if (isDeleted(report)) return false;
  if (view === "todo") return !isSentInQueue(report);
  if (view === "sent") return isSentInQueue(report);
  return true;
}

export function isDeliveryReady(report: QueueReport): boolean {
  return artifactStatus(report as never).deliveryReady;
}

export function isJobActive(report: QueueReport): boolean {
  return artifactStatus(report as never).jobActive;
}

function asOfferMode(value: string | null | undefined): OfferMode | null {
  if (value === "SCAN_UPSELL" || value === "FULL_PLAN_FREE") return value;
  return null;
}

export function decideMarkSent(
  report: QueueReport,
  options: {
    sentAt?: Date;
    override?: boolean;
    correct?: boolean;
    deliveryType?: string | null;
  } = {},
  now = new Date(),
): MarkSentDecision {
  if (isDeleted(report)) return { action: "skip", reason: "deleted" };
  if (hasPaidDeliveryRecord(report)) return { action: "skip", reason: "already-paid" };
  const deliveryType = asOfferMode(options.deliveryType) ?? asOfferMode(report.offerMode);
  if (!deliveryType) return { action: "skip", reason: "missing-offer-mode" };
  if (hasManualInitialSend(report) && !options.correct) {
    return { action: "skip", reason: "already-marked" };
  }
  if (!isDeliveryReady(report) && !options.override) {
    return { action: "skip", reason: "not-ready" };
  }
  return {
    action: options.correct && hasManualInitialSend(report) ? "correct" : "mark",
    sentAt: options.sentAt ?? now,
    deliveryType,
  };
}

export function decideUnmarkSent(report: QueueReport): UnmarkSentDecision {
  if (isDeleted(report)) return { action: "skip", reason: "deleted" };
  if (!hasManualInitialSend(report)) {
    return { action: "skip", reason: hasPaidDeliveryRecord(report) ? "paid-delivery" : "not-manually-marked" };
  }
  return { action: "unmark" };
}

export function decideDelete(
  report: QueueReport,
  options: { forceActiveJob?: boolean; confirmPaid?: boolean } = {},
): DeleteDecision {
  if (isDeleted(report)) return { action: "skip", reason: "already-deleted" };
  if (isJobActive(report) && !options.forceActiveJob) {
    return { action: "block", reason: "active-job" };
  }
  if (hasRealPayment(report) && !options.confirmPaid) {
    return { action: "block", reason: "paid-protected" };
  }
  return { action: "delete" };
}

export function decideRestore(report: QueueReport): RestoreDecision {
  if (!isDeleted(report)) return { action: "skip", reason: "not-deleted" };
  return { action: "restore" };
}
