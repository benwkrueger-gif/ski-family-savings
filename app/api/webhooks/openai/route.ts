import OpenAI from "openai";
import { log } from "@/lib/logger";
import { openaiClient } from "@/lib/openai/research";
import { completeOpenAiWebhookResponse } from "@/lib/pipeline/recover";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const rawBody = await request.text();
  const client = openaiClient();

  let event: Awaited<ReturnType<typeof client.webhooks.unwrap>>;
  try {
    event = await client.webhooks.unwrap(rawBody, request.headers, process.env.OPENAI_WEBHOOK_SECRET);
  } catch (error) {
    if (error instanceof OpenAI.InvalidWebhookSignatureError) {
      log.warn("openai_webhook_invalid_signature");
      return new Response("Invalid signature", { status: 400 });
    }
    log.error("openai_webhook_error", { error: error instanceof Error ? error.message : String(error) });
    return new Response("Invalid signature", { status: 400 });
  }

  const type = event.type;
  const responseId = "data" in event && event.data && "id" in event.data ? String(event.data.id) : undefined;
  log.info("openai_webhook_received", { type, openaiResponseId: responseId });

  if (!responseId) return new Response("ok", { status: 200 });

  const shouldIngest =
    type === "response.completed" ||
    type === "response.failed" ||
    type === "response.incomplete" ||
    type === "response.cancelled";

  if (!shouldIngest) {
    return new Response("ok", { status: 200 });
  }

  const result = await completeOpenAiWebhookResponse(responseId);
  log.info("openai_webhook_processed", {
    type,
    openaiResponseId: responseId,
    action: result.action,
    reportStatus: result.reportStatus,
  });

  if (result.action === "error") {
    log.error("openai_webhook_processing_failed", {
      openaiResponseId: responseId,
      error: result.message,
    });
    return new Response(result.message, { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
