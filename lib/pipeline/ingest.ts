import { randomUUID } from "crypto";
import { log } from "@/lib/logger";
import { familySummaryLine } from "@/lib/family/profile";
import {
  fieldsFromApi,
  fieldsFromWebhook,
  type TallyApiQuestion,
  type TallyApiSubmission,
  type TallyWebhookPayload,
} from "@/lib/tally/payload";
import { normalizeTallyAnswers } from "@/lib/tally/normalize";
import { upsertFromTally } from "@/lib/pipeline/store";
import { startResearch } from "@/lib/pipeline/research";
import type { CustomerReport } from "@/lib/db/schema";

export async function ingestTallyWebhook(
  payload: TallyWebhookPayload,
  options?: { autoResearch?: boolean },
): Promise<{ report: CustomerReport; created: boolean; researchStarted: boolean }> {
  const submissionId = payload.data?.submissionId || payload.data?.responseId;
  if (!submissionId) {
    throw new Error("Tally payload is missing submissionId");
  }

  const profile = normalizeTallyAnswers({
    internalId: randomUUID(),
    tallySubmissionId: submissionId,
    fields: fieldsFromWebhook(payload),
  });

  const submittedAt = payload.data?.createdAt ? new Date(payload.data.createdAt) : new Date();
  const { report, created } = await upsertFromTally({
    tallySubmissionId: submissionId,
    tallyFormId: payload.data?.formId,
    tallyEventId: payload.eventId,
    rawTallyJson: payload,
    profile,
    submittedAt,
    autoResearch: options?.autoResearch ?? true,
    source: "webhook",
  });

  if (created) {
    log.info("customer_created", {
      reportId: report.id,
      tallySubmissionId: submissionId,
      familySummary: familySummaryLine({ ...profile, internalId: report.id }),
    });
  } else {
    log.info("tally_webhook_duplicate", {
      reportId: report.id,
      tallySubmissionId: submissionId,
    });
  }

  const shouldResearch = (options?.autoResearch ?? true) && created && !report.openaiResponseId;
  if (shouldResearch) {
    try {
      await startResearch(report.id);
      return { report, created, researchStarted: true };
    } catch (error) {
      log.error("research_start_failed", {
        reportId: report.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return { report, created, researchStarted: false };
    }
  }

  return { report, created, researchStarted: false };
}

export async function ingestTallyApiSubmission(options: {
  questions: TallyApiQuestion[];
  submission: TallyApiSubmission;
  formId?: string;
}): Promise<{ report: CustomerReport; created: boolean }> {
  const submissionId = options.submission.id;
  const profile = normalizeTallyAnswers({
    internalId: randomUUID(),
    tallySubmissionId: submissionId,
    fields: fieldsFromApi(options.questions, options.submission),
  });

  return upsertFromTally({
    tallySubmissionId: submissionId,
    tallyFormId: options.formId || options.submission.formId,
    rawTallyJson: { source: "tally-api", submission: options.submission, questions: options.questions },
    profile,
    submittedAt: options.submission.submittedAt ? new Date(options.submission.submittedAt) : new Date(),
    autoResearch: false,
    source: "import",
  });
}
