import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

export const ChildSchema = z.object({
  age: z.number().int().nonnegative(),
  grade: z.string().optional(),
});

export const ReportMetaSchema = z.object({
  generatedDate: z.string(),
  reportId: z.string().optional(),
  season: z.string().optional(),
});

export const FamilySchema = z.object({
  firstName: z.string(),
  lastName: z.string().optional(),
  familyName: z.string().optional(),
  homeZip: z.string().optional(),
  adults: z.number().int().nonnegative().optional(),
  children: z.array(ChildSchema).default([]),
  skiProfile: z.string().optional(),
  annualDays: z.string().optional(),
  destinations: z.array(z.string()).default([]),
});

export const SummarySchema = z.object({
  headlineSavings: z.string(),
  headline: z.string(),
  subhead: z.string().optional(),
  confidence: z.string().optional(),
  jackpotCount: z.number().int().nonnegative().default(0),
  strongCount: z.number().int().nonnegative().default(0),
  usefulCount: z.number().int().nonnegative().default(0),
  watchCount: z.number().int().nonnegative().default(0),
});

export const FreeScanCtaSchema = z.object({
  headline: z.string(),
  body: z.string().optional(),
  bullets: z.array(z.string()).default([]),
  price: z.string().optional(),
  url: z.preprocess(emptyToUndefined, z.string().optional()),
  buttonLabel: z.string().optional(),
});

export const OpportunityAreaSchema = z.object({
  label: z.string(),
  teaser: z.string(),
});

export const FreeScanSchema = z.object({
  primaryOpportunityArea: z.string().optional(),
  secondaryOpportunityAreas: z.array(z.string()).default([]),
  opportunityAreas: z.array(OpportunityAreaSchema).default([]),
  biggestPotentialWin: z.string().optional(),
  biggestPotentialWinLabel: z.string().optional(),
  summaryText: z.string().optional(),
  importantUnknowns: z.array(z.string()).default([]),
  unknownsIntro: z.string().optional(),
  cta: FreeScanCtaSchema.optional(),
});

export const OpportunityMathSchema = z.object({
  normalCost: z.string().optional(),
  optimizedCost: z.string().optional(),
  estimatedSavings: z.string().optional(),
});

export const SourceSchema = z.object({
  name: z.string().optional(),
  label: z.string().optional(),
  url: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const OpportunitySchema = z.object({
  id: z.string().optional(),
  tier: z.enum(["jackpot", "strong", "useful", "watch"]),
  title: z.string(),
  location: z.string().optional(),
  potentialSavings: z.string().optional(),
  confidence: z.string().optional(),
  whyItMatters: z.string().optional(),
  howItWorks: z.string().optional(),
  whyYouQualify: z.string().optional(),
  recommendedAction: z.string().optional(),
  deadline: z.string().optional(),
  restrictions: z.array(z.string()).default([]),
  math: OpportunityMathSchema.optional(),
  source: SourceSchema.optional(),
  sources: z.array(SourceSchema).default([]),
});

export const StrategyStepSchema = z.object({
  number: z.number().int().positive(),
  title: z.string(),
  description: z.string().optional(),
  source: SourceSchema.optional(),
});

export const StrategySchema = z.object({
  headline: z.string().optional(),
  steps: z.array(StrategyStepSchema).default([]),
});

export const KnownSavingSchema = z.object({
  title: z.string(),
  note: z.string().optional(),
  source: SourceSchema.optional(),
});

export const WatchItemSchema = z.object({
  title: z.string(),
  whatWeAreWatching: z.string().optional(),
  whyItCouldMatter: z.string().optional(),
  expectedTiming: z.string().optional(),
  trigger: z.string().optional(),
  source: SourceSchema.optional(),
});

export const MonitoringSchema = z.object({
  enabled: z.boolean().default(true),
  title: z.string().optional(),
  body: z.string().optional(),
  bullets: z.array(z.string()).default([]),
  price: z.string().optional(),
  combinedFirstSeasonPrice: z.string().optional(),
  principle: z.string().optional(),
  addOnLabel: z.string().optional(),
  combinedLabel: z.string().optional(),
  url: z.preprocess(emptyToUndefined, z.string().optional()),
  combinedUrl: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const MethodologySchema = z.object({
  noFakeWins: z.boolean().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
});

export const SavingsMapItemSchema = z.object({
  label: z.string(),
  potential: z.string().optional(),
  note: z.string().optional(),
  kind: z.enum(["region", "watch"]).optional(),
});

export const ThankYouSchema = z.object({
  enabled: z.boolean().default(true),
  headline: z.string().optional(),
  body: z.string().optional(),
});

export const TestimonialSchema = z.object({
  quote: z.string().optional(),
  name: z.string().optional(),
});

export const ReportDataSchema = z.object({
  report: ReportMetaSchema,
  family: FamilySchema,
  summary: SummarySchema,
  freeScan: FreeScanSchema.optional(),
  savingsMap: z.array(SavingsMapItemSchema).default([]),
  opportunities: z.array(OpportunitySchema).default([]),
  strategy: StrategySchema.optional(),
  knownSavings: z.array(KnownSavingSchema).default([]),
  watch: z.array(WatchItemSchema).default([]),
  monitoring: MonitoringSchema.optional(),
  methodology: MethodologySchema.optional(),
  sources: z.array(SourceSchema).default([]),
  closingLine: z.string().optional(),
  referralLine: z.string().optional(),
  testimonial: TestimonialSchema.optional(),
  thankYou: ThankYouSchema.optional(),
});

export type ReportData = z.infer<typeof ReportDataSchema>;
export type Opportunity = z.infer<typeof OpportunitySchema>;
export type WatchItem = z.infer<typeof WatchItemSchema>;
export type KnownSaving = z.infer<typeof KnownSavingSchema>;
export type Family = z.infer<typeof FamilySchema>;
export type Source = z.infer<typeof SourceSchema>;

export function collectSources(
  ...groups: Array<Source | Source[] | undefined | null>
): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const group of groups) {
    const items = Array.isArray(group) ? group : group ? [group] : [];
    for (const item of items) {
      const key = item.url || item.name || item.label;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

export function parseReport(input: unknown): ReportData {
  return ReportDataSchema.parse(input);
}
