export const PIPELINE_STATUSES = [
  "RECEIVED",
  "RESEARCH_STARTING",
  "RESEARCHING",
  "RESEARCH_COMPLETE",
  "WRITING",
  "WRITING_FAILED",
  "PDF_GENERATING",
  "PDFS_READY",
  "GMAIL_DRAFT_READY",
  "RESEARCH_FAILED",
  "PDF_FAILED",
  "DRAFT_FAILED",
  "FREE_PLAN_READY",
  "PURCHASED",
  "PLAN_DELIVERING",
  "PLAN_DELIVERED",
  "PLAN_DELIVERY_FAILED",
] as const;

export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export const OFFER_MODES = ["SCAN_UPSELL", "FULL_PLAN_FREE"] as const;
export type OfferMode = (typeof OFFER_MODES)[number];

export const ERROR_STATUSES: PipelineStatus[] = [
  "RESEARCH_FAILED",
  "WRITING_FAILED",
  "PDF_FAILED",
  "DRAFT_FAILED",
  "PLAN_DELIVERY_FAILED",
];

export const RESEARCHING_STATUSES: PipelineStatus[] = [
  "RESEARCH_STARTING",
  "RESEARCHING",
];

export const READY_FOR_REVIEW_STATUSES: PipelineStatus[] = [
  "GMAIL_DRAFT_READY",
  "FREE_PLAN_READY",
  "PDFS_READY",
];

export const RECOVERABLE_RESEARCH_STATUSES: PipelineStatus[] = [
  "RESEARCH_STARTING",
  "RESEARCHING",
  "RESEARCH_COMPLETE",
  "WRITING",
  "WRITING_FAILED",
  "PDF_GENERATING",
  "PDF_FAILED",
  "PDFS_READY",
  "DRAFT_FAILED",
  "RESEARCH_FAILED",
];

export function isTerminalPaidStatus(status: PipelineStatus | null | undefined): boolean {
  return status === "PLAN_DELIVERED" || status === "PLAN_DELIVERING";
}

export function hasPurchased(status: PipelineStatus | null | undefined): boolean {
  return (
    status === "PURCHASED" ||
    status === "PLAN_DELIVERING" ||
    status === "PLAN_DELIVERED" ||
    status === "PLAN_DELIVERY_FAILED"
  );
}
