import { z } from "zod";

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

export const ConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export const OfferModeSchema = z.enum(["SCAN_UPSELL", "FULL_PLAN_FREE"]);
export const OpportunityTierSchema = z.enum(["JACKPOT", "STRONG", "USEFUL", "WATCH"]);
export const VerificationStatusSchema = z.enum(["VERIFIED", "HIGH_CONFIDENCE", "NEEDS_CHECK"]);
export const EnthusiasmSchema = z.enum(["HIGH", "MEDIUM", "LOW", "NONE"]);

export const ResearchFamilySchema = z.object({
  firstName: z.string(),
  lastName: nullableString,
  homeZip: nullableString,
  adults: nullableNumber,
  children: z.array(
    z.object({
      age: z.number(),
      grade: nullableString,
    }),
  ),
  skiProfile: nullableString,
  annualDays: nullableString,
  destinations: z.array(z.string()),
});

export const ResearchOpportunitySchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  tier: OpportunityTierSchema,
  familyMembersAffected: z.array(z.string()),
  eligibility: z.string(),
  familyFit: z.string(),
  baselineCost: nullableNumber,
  opportunityCost: nullableNumber,
  netSavingsLow: z.number(),
  netSavingsHigh: z.number(),
  calculation: z.string(),
  deadline: nullableString,
  restrictions: nullableString,
  blackoutDates: nullableString,
  stackability: z.string(),
  alreadyKnownByFamily: z.boolean(),
  verificationStatus: VerificationStatusSchema,
  countedInHeadline: z.boolean(),
  countReason: z.string(),
  sourceUrl: z.string(),
  sourceTitle: z.string(),
  sourceCheckedAt: z.string(),
  notes: z.string(),
  location: nullableString,
  whyItMatters: z.string(),
  howItWorks: z.string(),
  recommendedAction: z.string(),
});

export const ScenarioGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(["region", "optional", "watch"]),
  savingsLow: nullableNumber,
  savingsHigh: nullableNumber,
  note: z.string(),
});

export const ExistingKnownSavingSchema = z.object({
  title: z.string(),
  note: z.string(),
  sourceTitle: nullableString,
  sourceUrl: nullableString,
});

export const WatchItemResearchSchema = z.object({
  title: z.string(),
  whatWeAreWatching: z.string(),
  whyItCouldMatter: z.string(),
  expectedTiming: nullableString,
  trigger: nullableString,
  sourceTitle: nullableString,
  sourceUrl: nullableString,
});

export const StartHereStepSchema = z.object({
  number: z.number(),
  title: z.string(),
  description: z.string(),
  sourceTitle: nullableString,
  sourceUrl: nullableString,
});

export const FreeScanResearchSchema = z.object({
  headline: z.string(),
  summaryText: z.string(),
  primaryOpportunityArea: z.string(),
  opportunityAreas: z.array(
    z.object({
      label: z.string(),
      teaser: z.string(),
    }),
  ),
  biggestPotentialWin: nullableString,
  biggestPotentialWinLabel: nullableString,
  unknownsIntro: nullableString,
  importantUnknowns: z.array(z.string()),
  ctaHeadline: z.string(),
  ctaBody: z.string(),
  methodologyTitle: z.string(),
  methodologyText: z.string(),
});

export const PaidPlanResearchSchema = z.object({
  overview: z.string(),
  startHere: z.array(StartHereStepSchema),
  optionalScenarios: z.array(
    z.object({
      title: z.string(),
      note: z.string(),
      savingsLow: nullableNumber,
      savingsHigh: nullableNumber,
    }),
  ),
  alreadyDoingRight: z.array(ExistingKnownSavingSchema),
  bottomLine: z.string(),
  closingLine: z.string(),
  referralLine: nullableString,
  thankYouHeadline: z.string(),
  thankYouBody: z.string(),
});

export const ResearchSummarySchema = z.object({
  coreSavingsLow: z.number(),
  coreSavingsHigh: z.number(),
  optionalSavingsLow: z.number(),
  optionalSavingsHigh: z.number(),
  jackpotCount: z.number(),
  strongCount: z.number(),
  usefulCount: z.number(),
  watchCount: z.number(),
  confidence: ConfidenceSchema,
  rationale: z.string(),
  humanReviewFlags: z.array(z.string()),
  offerModeRecommendation: OfferModeSchema,
  offerModeReason: z.string(),
  headlineSavings: z.string(),
  headline: z.string(),
  subhead: z.string(),
});

export const EmailContextSchema = z.object({
  personalizedObservation: z.string(),
  enthusiasmLevel: EnthusiasmSchema,
});

export const CanonicalResearchSchema = z.object({
  family: ResearchFamilySchema,
  summary: ResearchSummarySchema,
  opportunities: z.array(ResearchOpportunitySchema),
  scenarioGroups: z.array(ScenarioGroupSchema),
  existingKnownSavings: z.array(ExistingKnownSavingSchema),
  watchlist: z.array(WatchItemResearchSchema),
  freeScan: FreeScanResearchSchema,
  paidPlan: PaidPlanResearchSchema,
  emailContext: EmailContextSchema,
});

export type CanonicalResearch = z.infer<typeof CanonicalResearchSchema>;
export type ResearchOpportunity = z.infer<typeof ResearchOpportunitySchema>;

export function parseResearch(input: unknown): CanonicalResearch {
  return CanonicalResearchSchema.parse(input);
}

export { formatMoneyRange as formatSavingsRange } from "./money";
