import assert from "node:assert/strict";
import { test } from "node:test";
import {
  displayTierFor,
  isFirmlyCountable,
  summarizeDisplaySavings,
  tierFromConservativeLow,
} from "../lib/research/display-savings.ts";
import { formatMoney, formatCustomerRange, displayCostPair, moneyEquation, roundCents } from "../lib/research/money.ts";
import { countableOpportunities } from "../lib/research/offer-mode.ts";
import { researchToReportData } from "../lib/research/to-report.ts";
import type { CanonicalResearch, ResearchOpportunity } from "../lib/research/schema.ts";

function opp(
  partial: Partial<ResearchOpportunity> & Pick<ResearchOpportunity, "id" | "tier">,
): ResearchOpportunity {
  return {
    name: partial.name ?? partial.id,
    category: partial.category ?? "test",
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

function researchWith(opportunities: ResearchOpportunity[], destinations = ["Sugarbush"]): CanonicalResearch {
  return {
    family: {
      firstName: "Ada",
      lastName: null,
      homeZip: "05401",
      adults: 2,
      children: [{ age: 8, grade: "3rd" }],
      skiProfile: "Local",
      annualDays: "16-30",
      destinations,
    },
    summary: {
      coreSavingsLow: 413.4,
      coreSavingsHigh: 1056.82,
      optionalSavingsLow: 0,
      optionalSavingsHigh: 0,
      jackpotCount: 1,
      strongCount: 2,
      usefulCount: 0,
      watchCount: 4,
      confidence: "MEDIUM",
      rationale: "test",
      humanReviewFlags: [
        "Confirm whether the 2026/27 Cochran's family pass has already been purchased or waived through ski-club registration. If so, remove $206.70 to $312.70 from the found savings.",
      ],
      offerModeRecommendation: "SCAN_UPSELL",
      offerModeReason: "test",
      headlineSavings: "$413-$1,057",
      headline: "test",
      subhead: "test",
    },
    opportunities,
    scenarioGroups: [],
    existingKnownSavings: [],
    watchlist: [],
    freeScan: {
      headline: "test",
      summaryText: "test",
      primaryOpportunityArea: "Kids access",
      opportunityAreas: [],
      biggestPotentialWin: null,
      biggestPotentialWinLabel: null,
      unknownsIntro: null,
      importantUnknowns: [],
      ctaHeadline: "cta",
      ctaBody: "body",
      methodologyTitle: "How I counted this",
      methodologyText: "counted carefully",
    },
    paidPlan: {
      overview: "Start with the home-mountain question.",
      startHere: [],
      optionalScenarios: [],
      alreadyDoingRight: [],
      bottomLine: "Ask about the home pass first.",
      closingLine: "Then go ski.",
      referralLine: null,
      thankYouHeadline: "Thanks",
      thankYouBody: "Reply if something looks off.",
    },
    emailContext: {
      personalizedObservation: "test",
      enthusiasmLevel: "HIGH",
    },
  };
}

test("money formatting keeps cents so 996.40 minus 789.70 equals 206.70", () => {
  const math = moneyEquation(996.4, 789.7);
  assert.equal(formatMoney(996.4), "$996.40");
  assert.equal(formatMoney(789.7), "$789.70");
  assert.equal(math.savings, 206.7);
  assert.equal(math.savingsLabel, "$206.70");
  assert.equal(math.mathNote, "$996.40 - $789.70 = $206.70");
  assert.equal(roundCents(996.4 - 789.7), 206.7);
  assert.notEqual(Math.round(996.4) - Math.round(789.7), Math.round(206.7));
});

test("customer-facing savings round down to whole dollars", () => {
  assert.equal(formatCustomerRange(206.7, 744.12), "$206-$744");
  assert.equal(formatCustomerRange(413.4, 1056.82), "$413-$1,056");
  assert.equal(formatCustomerRange(312.7, 312.7), "$312");
  const pair = displayCostPair(996.4, 789.7);
  assert.equal(pair.baseline, "$996");
  assert.equal(pair.optimized, "$790");
  assert.equal(pair.savings, "$206");
});

test("tiers come from the conservative low, not the optimistic high", () => {
  assert.equal(tierFromConservativeLow(0), "WATCH");
  assert.equal(tierFromConservativeLow(49), "USEFUL");
  assert.equal(tierFromConservativeLow(50), "STRONG");
  assert.equal(tierFromConservativeLow(206.7), "STRONG");
  assert.equal(tierFromConservativeLow(249), "STRONG");
  assert.equal(tierFromConservativeLow(250), "JACKPOT");
});

test("a $0-$75 gear benefit is Watch, not Strong", () => {
  const gear = opp({
    id: "gear",
    tier: "STRONG",
    category: "Gear",
    netSavingsLow: 0,
    netSavingsHigh: 75,
    countedInHeadline: false,
  });
  const research = researchWith([gear]);
  assert.equal(displayTierFor(gear), "WATCH");
  const summary = summarizeDisplaySavings(research);
  assert.equal(summary.counts.strongCount, 0);
  assert.equal(summary.counts.watchCount, 1);
  assert.equal(summary.firmLow, 0);
});

test("Mad River Glen stays Strong from the $206.70 low, not Jackpot from the high", () => {
  const mrg = opp({
    id: "mrg",
    name: "Mad River Glen family access",
    tier: "JACKPOT",
    category: "Nearby-mountain family access",
    location: "Mad River Glen, Waitsfield, Vermont",
    baselineCost: 996.4,
    opportunityCost: 789.7,
    netSavingsLow: 206.7,
    netSavingsHigh: 744.12,
    countedInHeadline: true,
  });
  const research = researchWith([mrg], ["Mad River Glen, considering"]);
  assert.equal(displayTierFor(mrg), "STRONG");
  assert.equal(isFirmlyCountable(mrg, research), false);
});

test("unresolved Cochran's purchase and optional Mad River Glen are not firm headline savings", () => {
  const cochrans = opp({
    id: "cochrans-reduced-family-pass-2627",
    name: "Cochran's reduced family pass",
    tier: "STRONG",
    category: "Home-mountain pass affordability",
    location: "Cochran's Ski Area, Richmond, Vermont",
    baselineCost: 312.7,
    opportunityCost: 106,
    netSavingsLow: 206.7,
    netSavingsHigh: 312.7,
    countedInHeadline: true,
    notes: "If the race-club registration already included a waived or reduced area pass, move this item.",
  });
  const mrg = opp({
    id: "mrg-family-access-strategy-2627",
    name: "Mad River Glen family access",
    tier: "JACKPOT",
    category: "Nearby-mountain family access",
    location: "Mad River Glen, Waitsfield, Vermont",
    baselineCost: 996.4,
    opportunityCost: 789.7,
    netSavingsLow: 206.7,
    netSavingsHigh: 744.12,
    countedInHeadline: true,
  });
  const gear = opp({
    id: "bolton-passholder-retail-gear-2627",
    name: "Bolton gear",
    tier: "STRONG",
    category: "Gear",
    netSavingsLow: 0,
    netSavingsHigh: 75,
    countedInHeadline: false,
  });
  const research = researchWith(
    [cochrans, mrg, gear],
    ["Cochran's Ski Area", "Mad River Glen, considering"],
  );
  const summary = summarizeDisplaySavings(research);
  assert.equal(summary.firmLow, 0);
  assert.equal(summary.firmHigh, 0);
  assert.equal(summary.conditionalLow, 413.4);
  assert.equal(summary.conditionalHigh, 1056.82);
  assert.equal(summary.counts.jackpotCount, 0);
  assert.equal(summary.counts.strongCount, 2);
  assert.equal(summary.counts.watchCount, 1);
  assert.equal(summary.offer.offerMode, "FULL_PLAN_FREE");
  assert.equal(summary.offer.coreSavingsLow, 0);
  assert.ok(countableOpportunities(research) >= 1);
  assert.ok(research.summary.coreSavingsLow >= 100);

  const data = researchToReportData({
    research,
    reportId: "rid",
    offerMode: summary.offer.offerMode,
  });
  assert.equal(data.summary.headlineKind, "conditional");
  assert.equal(data.summary.conditionalSavings, "$413-$1,056");
  assert.equal(data.freeScan?.cta, undefined);
  const mrgCard = data.opportunities.find((item) => item.id === "mrg-family-access-strategy-2627");
  assert.equal(mrgCard?.tier, "strong");
  assert.equal(mrgCard?.scenarios[0]?.savings, "$206");
  assert.deepEqual(
    mrgCard?.scenarios[0]?.buy?.map((item) => item.price),
    ["$425", "$320"],
  );
  assert.equal(mrgCard?.scenarios[0]?.comparedWith?.some((item) => item.estimated), true);
  assert.deepEqual(
    mrgCard?.scenarios[2]?.buy?.map((item) => item.price),
    ["$479", "$479"],
  );
});

test("Watch count is ledger opportunities only, not extra watchlist notes", () => {
  const gear = opp({
    id: "gear",
    tier: "WATCH",
    netSavingsLow: 0,
    netSavingsHigh: 75,
    countedInHeadline: false,
  });
  const research = researchWith([gear]);
  research.watchlist = [
    {
      title: "Race-program assistance",
      whatWeAreWatching: "fees",
      whyItCouldMatter: "racing",
      expectedTiming: null,
      trigger: null,
      sourceTitle: null,
      sourceUrl: null,
    },
    {
      title: "Youth equipment leases",
      whatWeAreWatching: "prices",
      whyItCouldMatter: "gear",
      expectedTiming: null,
      trigger: null,
      sourceTitle: null,
      sourceUrl: null,
    },
  ];
  const summary = summarizeDisplaySavings(research);
  assert.equal(summary.counts.watchCount, 1);
  const data = researchToReportData({
    research,
    reportId: "rid",
    offerMode: "FULL_PLAN_FREE",
  });
  assert.equal(data.summary.watchCount, 1);
  assert.equal(data.watch.length, 2);
  assert.equal(data.opportunities.filter((item) => item.tier === "watch").length, 1);
});

test("already-owned and unverified savings are not firm", () => {
  const owned = opp({
    id: "owned",
    tier: "JACKPOT",
    netSavingsLow: 500,
    netSavingsHigh: 500,
    alreadyKnownByFamily: true,
    countedInHeadline: true,
  });
  const unverified = opp({
    id: "unverified",
    tier: "JACKPOT",
    netSavingsLow: 300,
    netSavingsHigh: 300,
    verificationStatus: "NEEDS_CHECK",
    countedInHeadline: true,
  });
  const summary = summarizeDisplaySavings(researchWith([owned, unverified]));
  assert.equal(summary.firmLow, 0);
  assert.equal(summary.offer.offerMode, "FULL_PLAN_FREE");
  assert.equal(isFirmlyCountable(owned, researchWith([owned])), false);
  assert.equal(isFirmlyCountable(unverified, researchWith([unverified])), false);
});

test("mutually exclusive alternative scenarios are not added together", () => {
  const mrg = opp({
    id: "mrg-family-access-strategy-2627",
    name: "Mad River Glen family access",
    tier: "JACKPOT",
    category: "Nearby-mountain family access",
    location: "Mad River Glen, Waitsfield, Vermont",
    baselineCost: 996.4,
    opportunityCost: 789.7,
    netSavingsLow: 206.7,
    netSavingsHigh: 744.12,
    countedInHeadline: true,
  });
  const research = researchWith([mrg], ["Mad River Glen, considering"]);
  const summary = summarizeDisplaySavings(research);
  const card = summary.opportunities[0];
  assert.equal(card?.scenarios.length, 3);
  const summedScenarioHigh = 206 + 561 + 744;
  assert.equal(summary.conditionalHigh, 744.12);
  assert.ok(summary.conditionalHigh < summedScenarioHigh);
  assert.equal(summary.conditionalLow, 206.7);
});
