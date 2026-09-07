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
} from "@/lib/pipeline/store";
import { hasPurchased, type PipelineStatus } from "@/lib/pipeline/status";
import type { CustomerReport } from "@/lib/db/schema";
import { addPipelineLog } from "@/lib/db/settings";

const OPEN_STATUSES = new Set(["queued", "in_progress"]);
const FAILED_STATUSES = new Set(["failed", "incomplete", "cancelled"]);

export type RecoverAction =
  | "in_progress"
  | "already_complete"
  | "ingested"
  | "missing_response"
  | "stale"
  | "failed"
  | "error";

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
  return Boolean(
    report.researchJson &&
      report.pdfsReadyAt &&
      report.driveScanFileId &&
      report.drivePlanFileId &&
      report.gmailDraftId &&
      (report.status === "GMAIL_DRAFT_READY" ||
        report.status === "FREE_PLAN_READY" ||
        hasPurchased(report.status as PipelineStatus)),
  );
}

export async function recoverExistingResearch(
  reportId: string,
  options?: { incomingResponseId?: string },
): Promise<RecoverResult> {
  const report = await getReportById(reportId);
  if (!report) {
    return { ok: false, action: "error", message: `Report ${reportId} not found` };
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

    if (FAILED_STATUSES.has(retrieved.status) || !retrieved.research) {
      const detail = retrieved.error || `OpenAI response status ${retrieved.status}`;
      if (report.openaiResponseId === responseId) {
        await markError(report.id, "RESEARCH_FAILED", detail);
      }
      return {
        ok: false,
        action: "failed",
        openaiStatus: retrieved.status,
        reportStatus: "RESEARCH_FAILED",
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

    const needsPdfs = !current.pdfsReadyAt || !current.driveScanFileId || !current.drivePlanFileId;
    const needsDraft = !current.gmailDraftId;

    if (!needsPdfs && !needsDraft) {
      return {
        ok: true,
        action: alreadyStored ? "already_complete" : "ingested",
        openaiStatus: "completed",
        reportStatus: current.status,
        message: alreadyStored
          ? "Research was already stored for this response"
          : "Stored existing OpenAI research",
        report: current,
      };
    }

    if (needsPdfs) {
      current = await generateAndUploadPdfs(current.id);
    }
    if (needsDraft || needsPdfs) {
      if (!(hasPurchased(current.status as PipelineStatus) && current.gmailPaidMessageId)) {
        current = await createInitialGmailDraft(current.id);
      }
    }

    return {
      ok: true,
      action: "ingested",
      openaiStatus: "completed",
      reportStatus: current.status,
      message: "Recovered existing research, generated PDFs, and upserted the Gmail draft",
      report: current,
    };
  } catch (error) {
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
  const reports = await listRecoverableResearchReports();
  const results: RecoverResult[] = [];
  for (const report of reports) {
    results.push(await recoverExistingResearch(report.id));
  }
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
