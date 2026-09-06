import { log } from "@/lib/logger";
import type { FamilyProfile } from "@/lib/family/profile";
import { startBackgroundResearch } from "@/lib/openai/research";
import { getReportById, markError, setStatus, updateReport } from "@/lib/pipeline/store";
import { addPipelineLog } from "@/lib/db/settings";

export async function startResearch(reportId: string): Promise<void> {
  const report = await getReportById(reportId);
  if (!report) throw new Error(`Report ${reportId} not found`);

  const profile = report.familyProfile as FamilyProfile | null;
  if (!profile?.email && !profile?.firstName) {
    throw new Error("Cannot start research without a normalized family profile");
  }

  await setStatus(reportId, "RESEARCH_STARTING", "Starting OpenAI background research");
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
    });
    await addPipelineLog(reportId, "RESEARCHING", `OpenAI response ${responseId}`);
    log.info("openai_response_id", { reportId, openaiResponseId: responseId });
  } catch (error) {
    log.error("research_failed", {
      reportId,
      error: error instanceof Error ? error.message : String(error),
    });
    await markError(reportId, "RESEARCH_FAILED", error);
    throw error;
  }
}
