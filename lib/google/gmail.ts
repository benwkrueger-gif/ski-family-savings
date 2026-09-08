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

export async function sendGmailMessage(options: {
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
  const sent = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
  if (!sent.data.id) throw new Error("Gmail did not return a message id");
  return sent.data.id;
}

export function gmailDraftUrl(draftId: string): string {
  return `https://mail.google.com/mail/u/0/#drafts?compose=${draftId}`;
}
