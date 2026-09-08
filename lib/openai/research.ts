import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";
import type { FamilyProfile } from "@/lib/family/profile";
import { compactTallyAnswersForResearch } from "@/lib/tally/payload";
import { CanonicalResearchSchema, parseResearch, type CanonicalResearch } from "@/lib/research/schema";
import {
  decideRateLimitRetry,
  parseTpmRateLimit,
} from "@/lib/openai/rate-limit";

export const RESEARCH_MAX_OUTPUT_TOKENS = 48_000;
export const GPT56_DEFAULT_MAX_OUTPUT_TOKENS = 128_000;

let client: OpenAI | undefined;

export function openaiClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: env.openaiApiKey(),
      webhookSecret: process.env.OPENAI_WEBHOOK_SECRET,
    });
  }
  return client;
}

export function loadResearchSop(): string {
  return fs.readFileSync(path.join(process.cwd(), "prompts/research-sop.md"), "utf8");
}

export function buildResearchInputText(options: {
  profile: FamilyProfile;
  rawTallyJson: unknown;
}): string {
  return [
    "Research this family and return the canonical structured JSON.",
    "",
    "Normalized family profile:",
    JSON.stringify(options.profile),
    "",
    "Tally answers (label/value only, for fields the normalizer may have missed):",
    JSON.stringify(compactTallyAnswersForResearch(options.rawTallyJson)),
  ].join("\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startBackgroundResearch(options: {
  reportId: string;
  tallySubmissionId: string;
  profile: FamilyProfile;
  rawTallyJson: unknown;
  sleep?: (ms: number) => Promise<void>;
}): Promise<string> {
  const openai = openaiClient();
  const model = env.openaiResearchModel();
  const wait = options.sleep ?? sleep;
  const body = {
    model,
    background: true,
    store: true,
    max_output_tokens: RESEARCH_MAX_OUTPUT_TOKENS,
    reasoning: { effort: "high" as const },
    tools: [{ type: "web_search" as const, search_context_size: "high" as const }],
    metadata: {
      internalReportId: options.reportId,
      tallySubmissionId: options.tallySubmissionId,
    },
    text: {
      format: zodTextFormat(CanonicalResearchSchema, "ski_family_research"),
    },
    instructions: loadResearchSop(),
    input: [
      {
        role: "user" as const,
        content: [
          {
            type: "input_text" as const,
            text: buildResearchInputText(options),
          },
        ],
      },
    ],
  };

  let attempt = 0;
  while (true) {
    try {
      const response = await openai.responses.create(body, { maxRetries: 0 });
      if (!response.id) throw new Error("OpenAI did not return a response id");
      return response.id;
    } catch (error) {
      const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
      if (status !== 429) throw error;
      const parsed = parseTpmRateLimit({
        message: error instanceof Error ? error.message : String(error),
        headers:
          typeof error === "object" && error && "headers" in error
            ? (error.headers as Headers | undefined)
            : undefined,
      });
      const decision = decideRateLimitRetry({
        attempt,
        ...parsed,
      });
      if (decision.action !== "wait") {
        throw new Error(
          decision.action === "fail_oversized"
            ? `Research request exceeds the TPM budget (${decision.reason})`
            : error instanceof Error
              ? error.message
              : String(error),
        );
      }
      log.warn("research_rate_limited", {
        reportId: options.reportId,
        waitMs: decision.ms,
        limit: parsed.limit,
        used: parsed.used,
        requested: parsed.requested,
      });
      await wait(decision.ms);
      attempt += 1;
    }
  }
}

export function metadataReportId(metadata: Record<string, string> | null | undefined): string | undefined {
  return metadata?.internalReportId || metadata?.internal_report_id;
}

export function formatOpenAiResponseError(response: {
  status?: string | null;
  error?: { code?: string | null; message?: string | null } | null;
  incomplete_details?: { reason?: string | null } | null;
}): string {
  const code = response.error?.code?.trim();
  const message = response.error?.message?.trim();
  if (code && message) return `${code}: ${message}`;
  if (message) return message;
  if (code) return code;
  const reason = response.incomplete_details?.reason?.trim();
  if (reason) return `incomplete (${reason})`;
  return `OpenAI response status ${response.status ?? "unknown"}`;
}

export function parseResearchOutputText(text: string | null | undefined): CanonicalResearch | undefined {
  const raw = text?.trim();
  if (!raw) return undefined;
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    const fenced = raw.match(/\{[\s\S]*\}/);
    if (!fenced) return undefined;
    try {
      parsedJson = JSON.parse(fenced[0]);
    } catch {
      return undefined;
    }
  }
  try {
    return parseResearch(parsedJson);
  } catch {
    return undefined;
  }
}

export async function retrieveResearch(responseId: string): Promise<{
  status: string;
  research?: CanonicalResearch;
  metadata?: Record<string, string>;
  error?: string;
}> {
  const openai = openaiClient();
  const response = await openai.responses.retrieve(responseId);
  const metadata = (response.metadata ?? undefined) as Record<string, string> | undefined;
  const status = response.status ?? "unknown";
  const research = parseResearchOutputText(response.output_text);

  if (research) {
    return { status, metadata, research };
  }

  if (status !== "completed") {
    return {
      status,
      metadata,
      error: formatOpenAiResponseError(response),
    };
  }

  return { status, metadata, error: "OpenAI response completed without output_text" };
}
