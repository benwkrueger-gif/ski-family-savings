import { log } from "@/lib/logger";
import type { FamilyProfile } from "@/lib/family/profile";
import { startBackgroundResearch } from "@/lib/openai/research";
import {
  getReportById,
  listActiveResearchReports,
  listWaitingResearchReports,
  markError,
  setStatus,
  updateReport,
} from "@/lib/pipeline/store";
import { addPipelineLog } from "@/lib/db/settings";
import { canLaunchResearch, MAX_ACTIVE_RESEARCH_JOBS } from "@/lib/pipeline/research-capacity";

export type StartResearchResult = {
  started: boolean;
  reason: string;
};

export async function startNextWaitingResearch(exceptId?: string): Promise<StartResearchResult | null> {
  const active = await listActiveResearchReports();
  if (!canLaunchResearch(active.filter((row) => row.id !== exceptId).length)) return null;
  const waiting = (await listWaitingResearchReports()).filter((row) => row.id !== exceptId);
  const next = waiting[0];
  if (!next) return null;
  return startResearch(next.id);
}

export async function startResearch(reportId: string): Promise<StartResearchResult> {
  const report = await getReportById(reportId);
  if (!report) throw new Error(`Report ${reportId} not found`);

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
      `Waiting for research capacity (max ${MAX_ACTIVE_RESEARCH_JOBS} active job)`,
    );
    log.info("research_waiting_for_capacity", {
      reportId,
      active: active.map((row) => row.id),
    });
    return { started: false, reason: "waiting_for_capacity" };
  }

  await setStatus(reportId, "RESEARCH_STARTING", "Starting OpenAI background research");
  const raced = (await listActiveResearchReports()).filter((row) => row.id !== reportId);
  if (!canLaunchResearch(raced.length)) {
    await updateReport(reportId, { status: "RECEIVED", autoResearch: true });
    await addPipelineLog(
      reportId,
      "RECEIVED",
      `Waiting for research capacity (max ${MAX_ACTIVE_RESEARCH_JOBS} active job)`,
    );
    return { started: false, reason: "waiting_for_capacity" };
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
    });
    await addPipelineLog(reportId, "RESEARCHING", `OpenAI response ${responseId}`);
    log.info("openai_response_id", { reportId, openaiResponseId: responseId });
    return { started: true, reason: "started" };
  } catch (error) {
    log.error("research_failed", {
      reportId,
      error: error instanceof Error ? error.message : String(error),
    });
    await markError(reportId, "RESEARCH_FAILED", error);
    throw error;
  }
}
