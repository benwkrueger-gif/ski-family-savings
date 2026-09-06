import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { env } from "@/lib/env";
import type { FamilyProfile } from "@/lib/family/profile";
import { CanonicalResearchSchema, parseResearch, type CanonicalResearch } from "@/lib/research/schema";

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

export async function startBackgroundResearch(options: {
  reportId: string;
  tallySubmissionId: string;
  profile: FamilyProfile;
  rawTallyJson: unknown;
}): Promise<string> {
  const openai = openaiClient();
  const model = env.openaiResearchModel();
  const response = await openai.responses.create({
    model,
    background: true,
    store: true,
    reasoning: { effort: "high" },
    tools: [{ type: "web_search", search_context_size: "high" }],
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
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              "Research this family and return the canonical structured JSON.",
              "",
              "Normalized family profile:",
              JSON.stringify(options.profile, null, 2),
              "",
              "Raw Tally answers (for fields the normalizer may have missed):",
              JSON.stringify(options.rawTallyJson, null, 2),
            ].join("\n"),
          },
        ],
      },
    ],
  });

  if (!response.id) throw new Error("OpenAI did not return a response id");
  return response.id;
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

  if (status !== "completed") {
    return {
      status,
      metadata,
      error: formatOpenAiResponseError(response),
    };
  }

  const text = response.output_text?.trim();
  if (!text) {
    return { status, metadata, error: "OpenAI response completed without output_text" };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    const fenced = text.match(/\{[\s\S]*\}/);
    if (!fenced) return { status, metadata, error: "OpenAI output was not valid JSON" };
    parsedJson = JSON.parse(fenced[0]);
  }

  return {
    status,
    metadata,
    research: parseResearch(parsedJson),
  };
}
