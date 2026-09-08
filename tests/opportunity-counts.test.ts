import assert from "node:assert/strict";
import { test } from "node:test";
import { countOpportunityTiers } from "../lib/research/opportunity-counts.ts";
import type { ResearchOpportunity } from "../lib/research/schema.ts";

function opp(partial: Partial<ResearchOpportunity> & Pick<ResearchOpportunity, "id" | "tier">): ResearchOpportunity {
  return {
    name: partial.name ?? partial.id,
    category: "test",
    familyMembersAffected: [],
    eligibility: "",
    familyFit: "",
    baselineCost: null,
    opportunityCost: null,
    netSavingsLow: 0,
    netSavingsHigh: 0,
    calculation: "",
    deadline: null,
    restrictions: null,
    blackoutDates: null,
    stackability: "",
    alreadyKnownByFamily: false,
    verificationStatus: "VERIFIED",
    countedInHeadline: true,
    countReason: "",
    sourceUrl: "https://example.com",
    sourceTitle: "Example",
    sourceCheckedAt: "2026-09-07",
    notes: "",
    location: null,
    whyItMatters: "",
    howItWorks: "",
    recommendedAction: "",
    ...partial,
  };
}

test("counts unique ledger opportunities and skips already-known savings", () => {
  const counts = countOpportunityTiers([
    opp({ id: "a", tier: "JACKPOT" }),
    opp({ id: "a", tier: "JACKPOT" }),
    opp({ id: "b", tier: "STRONG" }),
    opp({ id: "c", tier: "STRONG", alreadyKnownByFamily: true }),
    opp({ id: "d", tier: "WATCH" }),
    opp({ id: "e", tier: "USEFUL" }),
  ]);
  assert.deepEqual(counts, {
    jackpotCount: 1,
    strongCount: 1,
    usefulCount: 1,
    watchCount: 1,
  });
});
