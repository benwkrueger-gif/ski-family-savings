import { after } from "next/server";
import OpenAI from "openai";
import { log } from "@/lib/logger";
import { openaiClient, retrieveResearch, metadataReportId } from "@/lib/openai/research";
import { continueAfterResearch, storeCompletedResearch } from "@/lib/pipeline/complete";
import {
  getReportById,
  getReportByOpenAiResponseId,
  markError,
} from "@/lib/pipeline/store";

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

  if (type === "response.failed" || type === "response.incomplete" || type === "response.cancelled") {
    let report = await getReportByOpenAiResponseId(responseId);
    let detail = `OpenAI ${type}`;
    try {
      const retrieved = await retrieveResearch(responseId);
      detail = retrieved.error || detail;
      if (!report) {
        const reportId = metadataReportId(retrieved.metadata);
        if (reportId) report = (await getReportById(reportId)) ?? undefined;
      }
    } catch (error) {
      log.error("openai_failure_retrieve_failed", {
        openaiResponseId: responseId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    if (report) {
      await markError(report.id, "RESEARCH_FAILED", detail);
      log.error("research_failed", {
        reportId: report.id,
        openaiResponseId: responseId,
        type,
        detail,
      });
    }
    return new Response("ok", { status: 200 });
  }

  if (type !== "response.completed") {
    return new Response("ok", { status: 200 });
  }

  after(async () => {
    try {
      const retrieved = await retrieveResearch(responseId);
      const reportId =
        metadataReportId(retrieved.metadata) ||
        (await getReportByOpenAiResponseId(responseId))?.id;
      if (!reportId) {
        log.error("openai_webhook_unmatched", { openaiResponseId: responseId });
        return;
      }
      const report = await getReportById(reportId);
      if (!report) return;

      if (report.researchJson && report.openaiResponseId === responseId && report.pdfsReadyAt) {
        log.info("openai_webhook_already_processed", { reportId, openaiResponseId: responseId });
        return;
      }

      if (!retrieved.research) {
        await markError(reportId, "RESEARCH_FAILED", retrieved.error || "Missing research JSON");
        return;
      }

      await storeCompletedResearch({
        reportId,
        research: retrieved.research,
        openaiResponseId: responseId,
      });
      await continueAfterResearch(reportId);
    } catch (error) {
      log.error("openai_webhook_processing_failed", {
        openaiResponseId: responseId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return new Response("ok", { status: 200 });
}
