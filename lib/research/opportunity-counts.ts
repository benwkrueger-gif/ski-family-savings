import type { CanonicalResearch, ResearchOpportunity } from "./schema";

export type OpportunityTierCounts = {
  jackpotCount: number;
  strongCount: number;
  usefulCount: number;
  watchCount: number;
};

const TIER_KEY = {
  JACKPOT: "jackpotCount",
  STRONG: "strongCount",
  USEFUL: "usefulCount",
  WATCH: "watchCount",
} as const;

export function countableLedgerOpportunities(
  opportunities: ResearchOpportunity[],
): ResearchOpportunity[] {
  const seen = new Set<string>();
  const unique: ResearchOpportunity[] = [];
  for (const opportunity of opportunities) {
    if (seen.has(opportunity.id)) continue;
    seen.add(opportunity.id);
    if (opportunity.alreadyKnownByFamily) continue;
    unique.push(opportunity);
  }
  return unique;
}

export function countOpportunityTiers(
  opportunities: ResearchOpportunity[],
): OpportunityTierCounts {
  const counts: OpportunityTierCounts = {
    jackpotCount: 0,
    strongCount: 0,
    usefulCount: 0,
    watchCount: 0,
  };
  for (const opportunity of countableLedgerOpportunities(opportunities)) {
    counts[TIER_KEY[opportunity.tier]] += 1;
  }
  return counts;
}

export function countOpportunityTiersFromResearch(
  research: CanonicalResearch,
): OpportunityTierCounts {
  return countOpportunityTiers(research.opportunities);
}
