import { log } from "@/lib/logger";
import type { FamilyProfile } from "@/lib/family/profile";
import { isTransientRateLimitError } from "@/lib/openai/rate-limit";
import { startBackgroundResearch } from "@/lib/openai/research";
import {
  claimResearchStart,
  getReportById,
  listActiveResearchReports,
  listWaitingResearchReports,
  markError,
  resetStaleResearchStarts,
  updateReport,
} from "@/lib/pipeline/store";
import { addPipelineLog } from "@/lib/db/settings";
import { canLaunchResearch, maxActiveResearchJobs } from "@/lib/pipeline/research-capacity";
import { hasManualInitialSend } from "@/lib/pipeline/admin-queue";
import { RESEARCHING_STATUSES, type PipelineStatus } from "@/lib/pipeline/status";

export type StartResearchResult = {
  started: boolean;
  reason: string;
};

export function interpretFailedResearchClaim(report: {
  status: string;
  openaiResponseId?: string | null;
  deletedAt?: Date | string | null;
  initialReportSentAt?: Date | string | null;
}): StartResearchResult {
  if (report.deletedAt) return { started: false, reason: "deleted" };
  if (report.initialReportSentAt) return { started: false, reason: "initial_report_sent" };
  if (report.openaiResponseId) return { started: false, reason: "has_existing_response" };
  if (RESEARCHING_STATUSES.includes(report.status as PipelineStatus)) {
    return { started: false, reason: "already_in_progress" };
  }
  return { started: false, reason: "waiting_for_capacity" };
}

async function requeueForLater(reportId: string, message: string): Promise<void> {
  await updateReport(reportId, {
    status: "RECEIVED",
    autoResearch: true,
    jobKind: null,
    jobStartedAt: null,
    lastError: message.slice(0, 2000),
    lastErrorAt: new Date(),
  });
  await addPipelineLog(reportId, "RECEIVED", message.slice(0, 2000));
}

export async function startNextWaitingResearch(exceptId?: string): Promise<StartResearchResult | null> {
  const active = await listActiveResearchReports();
  if (!canLaunchResearch(active.filter((row) => row.id !== exceptId).length)) return null;
  const waiting = (await listWaitingResearchReports()).filter((row) => row.id !== exceptId);
  const next = waiting[0];
  if (!next) return null;
  return startResearch(next.id);
}

export async function dispatchQueuedResearch(preferredId?: string): Promise<void> {
  try {
    await resetStaleResearchStarts();
  } catch (error) {
    log.error("research_reset_stale_starts_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  if (preferredId) {
    try {
      await startResearch(preferredId);
    } catch (error) {
      log.error("research_start_failed", {
        reportId: preferredId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  await startNextWaitingResearch(preferredId);
}

export async function startResearch(reportId: string): Promise<StartResearchResult> {
  const report = await getReportById(reportId);
  if (!report) throw new Error(`Report ${reportId} not found`);
  if (hasManualInitialSend(report)) {
    return { started: false, reason: "initial_report_sent" };
  }

  const profile = report.familyProfile as FamilyProfile | null;
  if (!profile?.email && !profile?.firstName) {
    throw new Error("Cannot start research without a normalized family profile");
  }

  if (report.openaiResponseId) {
    const { recoverExistingResearch } = await import("@/lib/pipeline/recover");
    const recovered = await recoverExistingResearch(reportId);
    if (recovered.ok) {
      return { started: false, reason: recovered.message };
    }
  }

  const active = (await listActiveResearchReports()).filter((row) => row.id !== reportId);
  if (!canLaunchResearch(active.length)) {
    await updateReport(reportId, {
      status: report.researchJson ? report.status : "RECEIVED",
      autoResearch: true,
    });
    await addPipelineLog(
      reportId,
      "RECEIVED",
      `Waiting for research capacity (max ${maxActiveResearchJobs()} active job)`,
    );
    log.info("research_waiting_for_capacity", {
      reportId,
      active: active.map((row) => row.id),
    });
    return { started: false, reason: "waiting_for_capacity" };
  }

  const claimed = await claimResearchStart(reportId);
  if (!claimed) {
    const current = (await getReportById(reportId)) ?? report;
    if (current.openaiResponseId && current.openaiResponseId !== report.openaiResponseId) {
      const { recoverExistingResearch } = await import("@/lib/pipeline/recover");
      const recovered = await recoverExistingResearch(reportId);
      if (recovered.ok) {
        return { started: false, reason: recovered.message };
      }
    }
    const outcome = interpretFailedResearchClaim(current);
    if (outcome.reason === "waiting_for_capacity") {
      await updateReport(reportId, {
        status: current.researchJson ? current.status : "RECEIVED",
        autoResearch: true,
      });
      await addPipelineLog(
        reportId,
        "RECEIVED",
        `Waiting for research capacity (max ${maxActiveResearchJobs()} active job)`,
      );
    }
    return outcome;
  }

  log.info("research_started", {
    reportId,
    tallySubmissionId: report.tallySubmissionId,
  });

  try {
    const responseId = await startBackgroundResearch({
      reportId,
      tallySubmissionId: report.tallySubmissionId,
      profile: { ...profile, internalId: reportId },
      rawTallyJson: report.rawTallyJson,
    });
    await updateReport(reportId, {
      status: "RESEARCHING",
      openaiResponseId: responseId,
      researchStartedAt: new Date(),
      lastError: null,
      autoResearch: true,
      jobKind: null,
      jobStartedAt: null,
    });
    await addPipelineLog(reportId, "RESEARCHING", `OpenAI response ${responseId}`);
    log.info("openai_response_id", { reportId, openaiResponseId: responseId });
    return { started: true, reason: "started" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("research_failed", { reportId, error: message });
    if (isTransientRateLimitError(error)) {
      await requeueForLater(
        reportId,
        `OpenAI rate-limited; queued for retry. ${message}`,
      );
      log.warn("research_requeued_rate_limit", { reportId });
      return { started: false, reason: "rate_limited" };
    }
    await markError(reportId, "RESEARCH_FAILED", error);
    throw error;
  }
}
