import { createHash } from "crypto";
import { buildSubmissionConfirmationEmail } from "@/lib/copy/emails";
import type { CustomerReport } from "@/lib/db/schema";
import { addPipelineLog } from "@/lib/db/settings";
import { env } from "@/lib/env";
import { findSentMessage, sendGmailMessage } from "@/lib/google/gmail";
import { log } from "@/lib/logger";
import {
  claimConfirmationDelivery,
  markConfirmationSent,
  markConfirmationUncertain,
} from "@/lib/pipeline/store";

export type ConfirmationOutcome =
  | "disabled"
  | "ineligible"
  | "already-handled"
  | "claimed-elsewhere"
  | "sent"
  | "recovered"
  | "uncertain";

type ConfirmationDependencies = {
  addLog: typeof addPipelineLog;
  claim: typeof claimConfirmationDelivery;
  findSent: typeof findSentMessage;
  markSent: typeof markConfirmationSent;
  markUncertain: typeof markConfirmationUncertain;
  send: typeof sendGmailMessage;
};

const defaultDependencies: ConfirmationDependencies = {
  addLog: addPipelineLog,
  claim: claimConfirmationDelivery,
  findSent: findSentMessage,
  markSent: markConfirmationSent,
  markUncertain: markConfirmationUncertain,
  send: sendGmailMessage,
};

export function shouldAttemptSubmissionConfirmation(input: {
  created: boolean;
  enabled: boolean;
  source: string;
}): boolean {
  return input.created && input.enabled && input.source === "webhook";
}

export function confirmationRfc822MessageId(tallySubmissionId: string): string {
  const digest = createHash("sha256").update(tallySubmissionId).digest("hex").slice(0, 24);
  return `<confirmation.${digest}@skifamilysavings.com>`;
}

export async function runConfirmationWithoutBlocking(
  task: () => Promise<unknown>,
): Promise<boolean> {
  try {
    await task();
    return true;
  } catch (error) {
    log.error("submission_confirmation_failed_without_blocking_intake", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function sendSubmissionConfirmation(
  report: CustomerReport,
  options: {
    enabled?: boolean;
    dependencies?: ConfirmationDependencies;
  } = {},
): Promise<ConfirmationOutcome> {
  const enabled = options.enabled ?? env.tallyConfirmationEmailEnabled();
  if (!enabled) return "disabled";
  if (report.source !== "webhook" || !report.email) return "ineligible";

  const dependencies = options.dependencies ?? defaultDependencies;
  if (report.gmailConfirmationMessageId || report.confirmationStatus === "SENT") {
    return "already-handled";
  }

  if (report.confirmationStatus === "SENDING" || report.confirmationStatus === "UNCERTAIN") {
    return reconcileConfirmation(report, dependencies);
  }

  const claimed = await dependencies.claim(report.id);
  if (!claimed) return "claimed-elsewhere";

  return deliverClaimedConfirmation(claimed, dependencies);
}

async function deliverClaimedConfirmation(
  report: CustomerReport,
  dependencies: ConfirmationDependencies,
): Promise<ConfirmationOutcome> {
  if (!report.email) return "ineligible";
  const rfc822MessageId = confirmationRfc822MessageId(report.tallySubmissionId);
  const email = buildSubmissionConfirmationEmail(report.firstName);

  let gmailMessageId: string;
  try {
    gmailMessageId = await dependencies.send({
      to: report.email,
      subject: email.subject,
      body: email.body,
      html: email.html,
      attachments: [],
      messageId: rfc822MessageId,
    });
  } catch (error) {
    const recovered = await dependencies.findSent({
      to: report.email,
      rfc822MessageId,
    });
    if (recovered && recovered !== "search-failed") {
      await dependencies.markSent(report.id, recovered);
      await addDeliveryLog(
        dependencies,
        report.id,
        "CONFIRMATION_SENT",
        "Submission confirmation reconciled from Gmail Sent",
      );
      log.info("submission_confirmation_recovered", { reportId: report.id });
      return "recovered";
    }

    await dependencies.markUncertain(report.id, error);
    await addDeliveryLog(
      dependencies,
      report.id,
      "CONFIRMATION_UNCERTAIN",
      "Gmail result uncertain; confirmation will not be resent automatically",
    );
    log.error("submission_confirmation_uncertain", {
      reportId: report.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return "uncertain";
  }

  await dependencies.markSent(report.id, gmailMessageId);
  await addDeliveryLog(
    dependencies,
    report.id,
    "CONFIRMATION_SENT",
    "Submission confirmation emailed",
  );
  log.info("submission_confirmation_sent", { reportId: report.id });
  return "sent";
}

async function reconcileConfirmation(
  report: CustomerReport,
  dependencies: ConfirmationDependencies,
): Promise<ConfirmationOutcome> {
  if (!report.email) return "ineligible";
  const recovered = await dependencies.findSent({
    to: report.email,
    rfc822MessageId: confirmationRfc822MessageId(report.tallySubmissionId),
  });
  if (!recovered || recovered === "search-failed") return "uncertain";

  await dependencies.markSent(report.id, recovered);
  await addDeliveryLog(
    dependencies,
    report.id,
    "CONFIRMATION_SENT",
    "Submission confirmation reconciled from Gmail Sent",
  );
  return "recovered";
}

async function addDeliveryLog(
  dependencies: ConfirmationDependencies,
  reportId: string,
  stage: string,
  message: string,
): Promise<void> {
  try {
    await dependencies.addLog(reportId, stage, message);
  } catch (error) {
    log.error("submission_confirmation_log_failed", {
      reportId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
