import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

export const EDITORIAL_STRUCTURED_OUTPUT_NAME = "ski_family_editorial";

export const WritingFindingSchema = z.object({
  heading: z.string().min(4).max(90),
  explanation: z.string().min(20).max(500),
});

export const WritingScenarioNoteSchema = z.object({
  label: z.string(),
  note: z.string().max(280),
});

export const WritingOpportunitySchema = z.object({
  id: z.string(),
  found: z.string().min(12).max(520),
  saveNote: z.string().min(8).max(360),
  action: z.string().min(12).max(520),
  catchNote: z.string().max(520).nullable(),
  timingNote: z.string().max(280).nullable(),
  scenarioNotes: z.array(WritingScenarioNoteSchema),
});

export const WritingStartHereSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(4).max(90),
  description: z.string().min(12).max(420),
});

export const WritingNamedNoteSchema = z.object({
  title: z.string(),
  note: z.string().min(8).max(280),
});

/** Schema sent to OpenAI Structured Outputs. Code-owned stamps must not appear here. */
export const EditorialModelSchema = z.object({
  scan: z.object({
    greeting: z.string().min(4).max(40),
    opening: z.string().min(20).max(500),
    savingsLine: z.string().min(12).max(280),
    findings: z.array(WritingFindingSchema).min(1).max(3),
    myTake: z.string().min(20).max(500),
    questions: z.array(z.string().min(8).max(140)).max(4),
    closing: z.string().max(280).nullable(),
  }),
  plan: z.object({
    opening: z.string().min(20).max(500),
    startHereIntro: z.string().max(220).nullable(),
    startHere: z.array(WritingStartHereSchema).max(5),
    myTake: z.string().min(20).max(420),
    bottomLine: z.string().min(12).max(280),
    thankYou: z.string().min(12).max(280),
    knownSavings: z.array(WritingNamedNoteSchema),
    opportunities: z.array(WritingOpportunitySchema),
    watchIntro: z.string().max(220).nullable(),
    watch: z.array(WritingNamedNoteSchema),
  }),
  email: z.object({
    observation: z.string().min(8).max(220),
    opening: z.string().min(12).max(320),
  }),
});

export const ReportWritingSchema = EditorialModelSchema.extend({
  scanContract: z.string().max(40).optional(),
});

export type EditorialModelWriting = z.infer<typeof EditorialModelSchema>;
export type ReportWriting = z.infer<typeof ReportWritingSchema>;

export function parseReportWriting(input: unknown): ReportWriting {
  return ReportWritingSchema.parse(input);
}

export function parseEditorialModelWriting(input: unknown): EditorialModelWriting {
  return EditorialModelSchema.parse(input);
}

export function editorialStructuredOutputFormat() {
  return zodTextFormat(EditorialModelSchema, EDITORIAL_STRUCTURED_OUTPUT_NAME);
}

export function assertOpenAiStrictObjectSchema(
  schema: unknown,
  path: string[] = [],
  issues: string[] = [],
): string[] {
  if (!schema || typeof schema !== "object") return issues;
  const node = schema as {
    type?: unknown;
    properties?: Record<string, unknown>;
    required?: unknown;
    additionalProperties?: unknown;
    items?: unknown;
    anyOf?: unknown;
    $defs?: Record<string, unknown>;
    definitions?: Record<string, unknown>;
  };
  if (node.properties && typeof node.properties === "object") {
    const keys = Object.keys(node.properties);
    const required = Array.isArray(node.required) ? node.required.filter((key): key is string => typeof key === "string") : [];
    for (const key of keys) {
      if (!required.includes(key)) {
        issues.push(
          `Schema field at \`${[...path, "properties", key].join("/")}\` uses \`.optional()\` without \`.nullable()\` which is not supported by the API.`,
        );
      }
      assertOpenAiStrictObjectSchema(node.properties[key], [...path, "properties", key], issues);
    }
  }
  if (node.items) assertOpenAiStrictObjectSchema(node.items, [...path, "items"], issues);
  if (Array.isArray(node.anyOf)) {
    node.anyOf.forEach((branch, index) => {
      assertOpenAiStrictObjectSchema(branch, [...path, "anyOf", String(index)], issues);
    });
  }
  for (const [name, definition] of Object.entries(node.$defs ?? node.definitions ?? {})) {
    assertOpenAiStrictObjectSchema(definition, [...path, "$defs", name], issues);
  }
  return issues;
}
