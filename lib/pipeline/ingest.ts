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
import { dispatchQueuedResearch, startResearch } from "@/lib/pipeline/research";
import type { CustomerReport } from "@/lib/db/schema";
import { env } from "@/lib/env";
import {
  runConfirmationWithoutBlocking,
  sendSubmissionConfirmation,
  shouldAttemptSubmissionConfirmation,
} from "@/lib/pipeline/confirmation";

export function shouldDispatchAutoResearch(options: {
  created: boolean;
  autoResearch: boolean;
  openaiResponseId?: string | null;
}): boolean {
  return options.autoResearch && options.created && !options.openaiResponseId;
}

async function sendConfirmationIfNeeded(report: CustomerReport, created: boolean): Promise<void> {
  const confirmationEnabled = env.tallyConfirmationEmailEnabled();
  if (
    shouldAttemptSubmissionConfirmation({
      created,
      enabled: confirmationEnabled,
      source: report.source,
    })
  ) {
    await runConfirmationWithoutBlocking(() =>
      sendSubmissionConfirmation(report, { enabled: confirmationEnabled }),
    );
  }
}

export async function runTallyWebhookSideEffects(options: {
  report: CustomerReport;
  created: boolean;
}): Promise<void> {
  await sendConfirmationIfNeeded(options.report, options.created);
  const preferredId = shouldDispatchAutoResearch({
    created: options.created,
    autoResearch: options.report.autoResearch,
    openaiResponseId: options.report.openaiResponseId,
  })
    ? options.report.id
    : undefined;
  await dispatchQueuedResearch(preferredId);
}

export async function ingestTallyWebhook(
  payload: TallyWebhookPayload,
  options?: { autoResearch?: boolean; deferSideEffects?: boolean },
): Promise<{ report: CustomerReport; created: boolean; researchStarted: boolean }> {
  const submissionId = payload.data?.submissionId || payload.data?.responseId;
  if (!submissionId) {
    throw new Error("Tally payload is missing submissionId");
  }

  const autoResearch = options?.autoResearch ?? true;
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
    autoResearch,
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

  if (options?.deferSideEffects) {
    return { report, created, researchStarted: false };
  }

  await sendConfirmationIfNeeded(report, created);

  const shouldResearch = shouldDispatchAutoResearch({
    created,
    autoResearch,
    openaiResponseId: report.openaiResponseId,
  });
  let researchStarted = false;
  if (shouldResearch) {
    try {
      const result = await startResearch(report.id);
      researchStarted = result.started;
    } catch (error) {
      log.error("research_start_failed", {
        reportId: report.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { report, created, researchStarted };
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
