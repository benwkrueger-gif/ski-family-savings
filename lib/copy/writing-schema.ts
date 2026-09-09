import { z } from "zod";

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

export const ReportWritingSchema = z.object({
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

export type ReportWriting = z.infer<typeof ReportWritingSchema>;

export function parseReportWriting(input: unknown): ReportWriting {
  return ReportWritingSchema.parse(input);
}
