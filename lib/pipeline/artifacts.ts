import { createHash } from "crypto";
import type { CustomerReport } from "@/lib/db/schema";
import type { OfferMode } from "@/lib/pipeline/status";

export const REPORT_TEMPLATE_VERSION = "approved-scan-plan-v1";
export const DEFAULT_EDITORIAL_TIMEOUT_MS = 120_000;
export const JOB_STALE_MS = 6 * 60 * 1000;

export type ArtifactHealth = "current" | "missing" | "stale";

export type ArtifactStatus = {
  research: ArtifactHealth;
  writing: ArtifactHealth;
  pdfs: ArtifactHealth;
  draft: ArtifactHealth;
  deliveryReady: boolean;
  jobActive: boolean;
  jobKind: string | null;
  jobStartedAt: Date | null;
};

export function writingFingerprint(input: {
  openaiResponseId?: string | null;
  offerMode: OfferMode | string;
}): string {
  return createHash("sha256")
    .update(`${REPORT_TEMPLATE_VERSION}|${input.offerMode}|${input.openaiResponseId ?? ""}`)
    .digest("hex")
    .slice(0, 24);
}

export function jobConflict(
  report: Pick<CustomerReport, "jobKind" | "jobStartedAt">,
  now = new Date(),
  staleMs = JOB_STALE_MS,
): "none" | "active" | "stale" {
  if (!report.jobKind || !report.jobStartedAt) return "none";
  const age = now.getTime() - new Date(report.jobStartedAt).getTime();
  if (age > staleMs) return "stale";
  return "active";
}

export function artifactStatus(report: CustomerReport): ArtifactStatus {
  const offerMode = report.offerMode;
  const expected =
    offerMode && report.openaiResponseId
      ? writingFingerprint({ openaiResponseId: report.openaiResponseId, offerMode })
      : null;
  const research: ArtifactHealth = report.researchJson ? "current" : "missing";
  const writing: ArtifactHealth = !report.writingJson
    ? "missing"
    : expected && report.writingFingerprint === expected
      ? "current"
      : "stale";
  const pdfs: ArtifactHealth =
    !report.driveScanFileId || !report.drivePlanFileId || !report.pdfsReadyAt
      ? "missing"
      : writing === "current" && report.pdfsFingerprint === report.writingFingerprint
        ? "current"
        : "stale";
  const expectedDraftStatus = offerMode === "FULL_PLAN_FREE" ? "FREE_PLAN_READY" : "GMAIL_DRAFT_READY";
  const draft: ArtifactHealth =
    !report.gmailDraftId || !report.draftReadyAt
      ? "missing"
      : writing === "current" &&
          pdfs === "current" &&
          report.draftFingerprint === report.writingFingerprint &&
          report.status === expectedDraftStatus
        ? "current"
        : "stale";
  const conflict = jobConflict(report);
  return {
    research,
    writing,
    pdfs,
    draft,
    deliveryReady: writing === "current" && pdfs === "current" && draft === "current",
    jobActive: conflict === "active",
    jobKind: conflict === "active" ? report.jobKind : null,
    jobStartedAt: conflict === "active" ? report.jobStartedAt : null,
  };
}

export class JobInProgressError extends Error {
  readonly statusCode = 409;
  readonly action = "in_progress" as const;
  constructor(message: string) {
    super(message);
    this.name = "JobInProgressError";
  }
}
