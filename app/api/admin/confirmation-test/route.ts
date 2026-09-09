import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { buildSubmissionConfirmationEmail } from "@/lib/copy/emails";
import { googleSenderEmail } from "@/lib/env";
import { sendGmailMessage } from "@/lib/google/gmail";
import { log } from "@/lib/logger";
import { confirmationRfc822MessageId } from "@/lib/pipeline/confirmation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const to = googleSenderEmail();
  const email = buildSubmissionConfirmationEmail("Ben");
  await sendGmailMessage({
    to,
    subject: email.subject,
    body: email.body,
    html: email.html,
    attachments: [],
    messageId: confirmationRfc822MessageId(`internal-test-${randomUUID()}`),
  });
  log.info("submission_confirmation_test_sent");

  return NextResponse.json({ ok: true, sentTo: to });
}
