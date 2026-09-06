import { log } from "@/lib/logger";
import { env } from "@/lib/env";
import { verifyTallySignature } from "@/lib/tally/signature";
import { ingestTallyWebhook } from "@/lib/pipeline/ingest";
import { claimWebhookEvent } from "@/lib/pipeline/store";
import type { TallyWebhookPayload } from "@/lib/tally/payload";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("tally-signature") ?? request.headers.get("Tally-Signature");

  let secret: string;
  try {
    secret = env.tallyWebhookSecret();
  } catch {
    log.error("tally_webhook_misconfigured");
    return new Response("Webhook not configured", { status: 500 });
  }

  if (!verifyTallySignature(rawBody, signature, secret)) {
    log.warn("tally_webhook_invalid_signature");
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: TallyWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as TallyWebhookPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventId = payload.eventId || payload.data?.submissionId;
  log.info("tally_webhook_received", {
    eventId,
    tallySubmissionId: payload.data?.submissionId,
    formId: payload.data?.formId,
  });

  try {
    const result = await ingestTallyWebhook(payload, { autoResearch: true });
    if (eventId) {
      await claimWebhookEvent({
        provider: "tally",
        eventId,
        reportId: result.report.id,
        payload,
      });
    }
    return Response.json({ ok: true, reportId: result.report.id, created: result.created });
  } catch (error) {
    log.error("tally_webhook_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response("error", { status: 500 });
  }
}
