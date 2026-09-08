import { google } from "googleapis";
import { googleSenderEmail } from "@/lib/env";
import { getGoogleAuth } from "./auth";
import { buildRawEmail } from "./mime";

async function gmailClient() {
  const auth = await getGoogleAuth();
  return google.gmail({ version: "v1", auth });
}

export type GmailAttachment = {
  filename: string;
  contentType: string;
  bytes: Buffer;
};

export async function upsertGmailDraft(options: {
  existingDraftId?: string | null;
  to: string;
  subject: string;
  body: string;
  html?: string;
  attachments: GmailAttachment[];
}): Promise<string> {
  const gmail = await gmailClient();
  const raw = buildRawEmail({
    from: `Ben <${googleSenderEmail()}>`,
    to: options.to,
    subject: options.subject,
    text: options.body,
    html: options.html,
    attachments: options.attachments,
  });

  if (options.existingDraftId) {
    try {
      const updated = await gmail.users.drafts.update({
        userId: "me",
        id: options.existingDraftId,
        requestBody: { message: { raw } },
      });
      if (updated.data.id) return updated.data.id;
    } catch {
      // Draft may have been sent or deleted. Create a new one instead.
    }
  }

  const created = await gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw } },
  });
  if (!created.data.id) throw new Error("Gmail did not return a draft id");
  return created.data.id;
}

export function paidRfc822MessageId(reportId: string, sessionId: string): string {
  const session = sessionId.replace(/[^a-zA-Z0-9-]/g, "").slice(-16) || "session";
  return `<paid.${reportId}.${session}@skifamilysavings.com>`;
}

export async function sendGmailMessage(options: {
  to: string;
  subject: string;
  body: string;
  html?: string;
  attachments: GmailAttachment[];
  messageId?: string;
}): Promise<string> {
  const gmail = await gmailClient();
  const raw = buildRawEmail({
    from: `Ben <${googleSenderEmail()}>`,
    to: options.to,
    subject: options.subject,
    text: options.body,
    html: options.html,
    attachments: options.attachments,
    messageId: options.messageId,
  });
  const sent = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
  if (!sent.data.id) throw new Error("Gmail did not return a message id");
  return sent.data.id;
}

export async function findSentPaidMessage(options: {
  to: string;
  rfc822MessageId: string;
}): Promise<string | null | "search-failed"> {
  try {
    const gmail = await gmailClient();
    const listed = await gmail.users.messages.list({
      userId: "me",
      q: `in:sent to:${options.to} rfc822msgid:${options.rfc822MessageId.replace(/^<|>$/g, "")}`,
      maxResults: 1,
    });
    return listed.data.messages?.[0]?.id ?? null;
  } catch {
    return "search-failed";
  }
}

export function gmailDraftUrl(draftId: string): string {
  return `https://mail.google.com/mail/u/0/#drafts?compose=${draftId}`;
}
