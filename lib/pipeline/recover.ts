import { log } from "@/lib/logger";
import { metadataReportId, retrieveResearch } from "@/lib/openai/research";
import {
  createInitialGmailDraft,
  generateAndUploadPdfs,
  storeCompletedResearch,
} from "@/lib/pipeline/complete";
import {
  getReportById,
  getReportByOpenAiResponseId,
  listRecoverableResearchReports,
  markError,
  resetStaleResearchStarts,
} from "@/lib/pipeline/store";
import { hasPurchased, type PipelineStatus } from "@/lib/pipeline/status";
import { hasManualInitialSend } from "@/lib/pipeline/admin-queue";
import type { CustomerReport } from "@/lib/db/schema";
import { addPipelineLog } from "@/lib/db/settings";
import { JobInProgressError, SentReportRefreshError, artifactStatus, jobConflict } from "@/lib/pipeline/artifacts";

const OPEN_STATUSES = new Set(["queued", "in_progress"]);
const FAILED_STATUSES = new Set(["failed", "incomplete", "cancelled"]);

export type RecoverAction =
  | "in_progress"
  | "already_complete"
  | "ingested"
  | "missing_response"
  | "stale"
  | "failed"
  | "error"
  | "requeued";

export type RecoverResult = {
  ok: boolean;
  action: RecoverAction;
  openaiStatus?: string;
  reportStatus?: string;
  message: string;
  report?: CustomerReport;
};

export function staleOpenAiResponseReason(options: {
  reportId: string;
  currentResponseId: string | null | undefined;
  incomingResponseId: string;
  metadataReportId?: string;
}): string | null {
  if (options.metadataReportId && options.metadataReportId !== options.reportId) {
    return "OpenAI response metadata does not match this report";
  }
  if (options.currentResponseId && options.currentResponseId !== options.incomingResponseId) {
    return "Stale OpenAI response; a newer research attempt is in progress";
  }
  return null;
}

function isFullyDelivered(report: CustomerReport): boolean {
  return artifactStatus(report).deliveryReady || hasPurchased(report.status as PipelineStatus);
}

async function startNextIfIdle(exceptId?: string): Promise<void> {
  const { startNextWaitingResearch } = await import("@/lib/pipeline/research");
  try {
    await startNextWaitingResearch(exceptId);
  } catch (error) {
    log.error("research_start_next_failed", {
      exceptId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function recoverExistingResearch(
  reportId: string,
  options?: { incomingResponseId?: string },
): Promise<RecoverResult> {
  const report = await getReportById(reportId);
  if (!report) {
    return { ok: false, action: "error", message: `Report ${reportId} not found` };
  }

  if (hasManualInitialSend(report)) {
    return {
      ok: true,
      action: "already_complete",
      openaiStatus: "completed",
      reportStatus: report.status,
      message: "Initial report was already marked sent. PDFs and Gmail drafts were left unchanged.",
      report,
    };
  }

  if (options?.incomingResponseId) {
    const staleBeforeRetrieve = staleOpenAiResponseReason({
      reportId: report.id,
      currentResponseId: report.openaiResponseId,
      incomingResponseId: options.incomingResponseId,
    });
    if (staleBeforeRetrieve) {
      log.warn("openai_response_stale", {
        reportId: report.id,
        incomingResponseId: options.incomingResponseId,
      });
      return {
        ok: false,
        action: "stale",
        reportStatus: report.status,
        message: staleBeforeRetrieve,
        report,
      };
    }
  }

  const responseId = report.openaiResponseId || options?.incomingResponseId;
  if (!responseId) {
    return {
      ok: false,
      action: "missing_response",
      reportStatus: report.status,
      message: "This report has no OpenAI response ID to recover",
      report,
    };
  }

  if (isFullyDelivered(report) && report.openaiResponseId === responseId) {
    return {
      ok: true,
      action: "already_complete",
      openaiStatus: "completed",
      reportStatus: report.status,
      message: "Research, PDFs, and Gmail draft are already ready for this response",
      report,
    };
  }

  try {
    const retrieved = await retrieveResearch(responseId);
    const stale = staleOpenAiResponseReason({
      reportId: report.id,
      currentResponseId: report.openaiResponseId,
      incomingResponseId: responseId,
      metadataReportId: metadataReportId(retrieved.metadata),
    });
    if (stale) {
      log.warn("openai_response_stale", { reportId: report.id, incomingResponseId: responseId });
      return {
        ok: false,
        action: "stale",
        openaiStatus: retrieved.status,
        reportStatus: report.status,
        message: stale,
        report,
      };
    }

    if (OPEN_STATUSES.has(retrieved.status)) {
      return {
        ok: true,
        action: "in_progress",
        openaiStatus: retrieved.status,
        reportStatus: report.status,
        message: `OpenAI status ${retrieved.status}. No new research was started.`,
        report,
      };
    }

    if (!retrieved.research) {
      const detail = retrieved.error || `OpenAI response status ${retrieved.status}`;
      if (FAILED_STATUSES.has(retrieved.status) && report.openaiResponseId === responseId) {
        await markError(report.id, "RESEARCH_FAILED", detail);
      }
      return {
        ok: false,
        action: "failed",
        openaiStatus: retrieved.status,
        reportStatus: FAILED_STATUSES.has(retrieved.status) ? "RESEARCH_FAILED" : report.status,
        message: detail,
      };
    }

    let current = report;
    const alreadyStored =
      Boolean(current.researchJson) &&
      Boolean(current.researchCompletedAt) &&
      current.openaiResponseId === responseId;

    if (!alreadyStored) {
      current = await storeCompletedResearch({
        reportId: current.id,
        research: retrieved.research,
        openaiResponseId: responseId,
      });
      await addPipelineLog(current.id, current.status, "Ingested existing OpenAI response");
    }

    if (jobConflict(current) === "active") {
      return {
        ok: true,
        action: "in_progress",
        openaiStatus: "completed",
        reportStatus: current.status,
        message: `A ${current.jobKind} job is already running. No new research was started.`,
        report: current,
      };
    }

    const artifacts = artifactStatus(current);
    const needsPdfs = artifacts.pdfs !== "current";
    const needsDraft = artifacts.draft !== "current";

    if (!needsPdfs && !needsDraft) {
      const stored = {
        ok: true,
        action: alreadyStored ? ("already_complete" as const) : ("ingested" as const),
        openaiStatus: retrieved.status,
        reportStatus: current.status,
        message: alreadyStored
          ? "Research was already stored for this response"
          : "Stored existing OpenAI research",
        report: current,
      };
      await startNextIfIdle(current.id);
      return stored;
    }

    if (needsPdfs) {
      current = await generateAndUploadPdfs(current.id);
    }
    if (needsDraft || needsPdfs) {
      if (!(hasPurchased(current.status as PipelineStatus) && current.gmailPaidMessageId)) {
        current = await createInitialGmailDraft(current.id);
      }
    }

    const finished = {
      ok: true,
      action: "ingested" as const,
      openaiStatus: retrieved.status,
      reportStatus: current.status,
      message: "Recovered existing research, generated PDFs, and upserted the Gmail draft",
      report: current,
    };
    await startNextIfIdle(current.id);
    return finished;
  } catch (error) {
    if (error instanceof SentReportRefreshError) {
      const current = await getReportById(reportId);
      return {
        ok: true,
        action: "already_complete",
        reportStatus: current?.status,
        message: error.message,
        report: current ?? report,
      };
    }
    if (error instanceof JobInProgressError) {
      const current = await getReportById(reportId);
      return {
        ok: true,
        action: "in_progress",
        reportStatus: current?.status,
        message: error.message,
        report: current ?? report,
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    log.error("research_recover_failed", { reportId, error: message });
    return {
      ok: false,
      action: "error",
      reportStatus: report.status,
      message,
      report,
    };
  }
}

export async function recoverStuckResearchJobs(): Promise<RecoverResult[]> {
  const reset = await resetStaleResearchStarts();
  const reports = await listRecoverableResearchReports();
  const results: RecoverResult[] = reset.map((report) => ({
    ok: true,
    action: "requeued" as const,
    reportStatus: report.status,
    message: "Stale research start was requeued without an OpenAI response id",
    report,
  }));
  for (const report of reports) {
    results.push(await recoverExistingResearch(report.id));
  }
  await startNextIfIdle();
  return results;
}

export async function completeOpenAiWebhookResponse(responseId: string): Promise<RecoverResult> {
  let report = await getReportByOpenAiResponseId(responseId);
  if (!report) {
    const retrieved = await retrieveResearch(responseId);
    const metaId = metadataReportId(retrieved.metadata);
    if (metaId) report = await getReportById(metaId);
  }
  if (!report) {
    return {
      ok: false,
      action: "error",
      message: `No report matched OpenAI response ${responseId}`,
    };
  }
  return recoverExistingResearch(report.id, { incomingResponseId: responseId });
}
