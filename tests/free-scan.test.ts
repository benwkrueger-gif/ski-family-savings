import assert from "node:assert/strict";
import { test } from "node:test";
import { freeScanLeakFlags, researchToReportData } from "../lib/research/to-report.ts";
import type { CanonicalResearch } from "../lib/research/schema.ts";

function sampleResearch(overrides?: Partial<CanonicalResearch>): CanonicalResearch {
  const base: CanonicalResearch = {
    family: {
      firstName: "Ada",
      lastName: null,
      homeZip: "05401",
      adults: 2,
      children: [{ age: 8, grade: "3rd" }],
      skiProfile: "Local plus destination",
      annualDays: "16-30",
      destinations: ["Sugarbush"],
    },
    summary: {
      coreSavingsLow: 250,
      coreSavingsHigh: 400,
      optionalSavingsLow: 0,
      optionalSavingsHigh: 0,
      jackpotCount: 1,
      strongCount: 0,
      usefulCount: 0,
      watchCount: 0,
      confidence: "HIGH",
      rationale: "One solid kids program.",
      humanReviewFlags: [],
      offerModeRecommendation: "SCAN_UPSELL",
      offerModeReason: "compelling",
      headlineSavings: "$250-$400",
      headline: "Ada, I found meaningful ski savings worth pursuing.",
      subhead: "I dug through the plans you sent me.",
    },
    opportunities: [
      {
        id: "opp-1",
        name: "Secret Youth Passport",
        category: "kids",
        tier: "JACKPOT",
        familyMembersAffected: ["8 year old"],
        eligibility: "Grade 3",
        familyFit: "Your 8 year old is in the grade window.",
        baselineCost: 400,
        opportunityCost: 50,
        netSavingsLow: 250,
        netSavingsHigh: 400,
        calculation: "400-50-fees",
        deadline: "October 15",
        restrictions: "Weekdays",
        blackoutDates: null,
        stackability: "Does not stack with Ikon",
        alreadyKnownByFamily: false,
        verificationStatus: "VERIFIED",
        countedInHeadline: true,
        countReason: "Verified official program",
        sourceUrl: "https://example.com/passport",
        sourceTitle: "Official passport",
        sourceCheckedAt: "2026-09-06",
        notes: "",
        location: "Vermont",
        whyItMatters: "Kids tickets add up.",
        howItWorks: "Buy the official passport.",
        recommendedAction: "Buy it this month.",
      },
    ],
    scenarioGroups: [
      { id: "local", label: "Local Vermont", kind: "region", savingsLow: 250, savingsHigh: 400, note: "Kids access." },
    ],
    existingKnownSavings: [],
    watchlist: [],
    freeScan: {
      headline: "Ada, I found meaningful ski savings worth pursuing.",
      summaryText: "Most of the money appears to be in kids access, not random Tuesday tickets.",
      primaryOpportunityArea: "Kids access",
      opportunityAreas: [
        { label: "Kids access", teaser: "One of your kids is in a window where youth pricing starts to matter." },
      ],
      biggestPotentialWin: "$250+",
      biggestPotentialWinLabel: "Biggest potential win",
      unknownsIntro: "To tighten this estimate, I'd want to confirm:",
      importantUnknowns: ["exact pass product"],
      ctaHeadline: "Want to see exactly where the savings are?",
      ctaBody: "The Savings Plan includes the exact programs.",
      methodologyTitle: "No fake wins",
      methodologyText: "I only counted things I could stand behind.",
    },
    paidPlan: {
      overview: "Start with the kids access decision.",
      startHere: [
        {
          number: 1,
          title: "Get the youth passport",
          description: "Buy it before the deadline.",
          sourceTitle: "Official passport",
          sourceUrl: "https://example.com/passport",
        },
      ],
      optionalScenarios: [],
      alreadyDoingRight: [],
      bottomLine: "Do the kids thing first.",
      closingLine: "Then go ski.",
      referralLine: null,
      thankYouHeadline: "Thanks for testing this out.",
      thankYouBody: "Reply if something looks off.",
    },
    emailContext: {
      personalizedObservation: "Your Sugarbush days plus an 8 year old made this a fun one to dig into.",
      enthusiasmLevel: "HIGH",
    },
  };
  return { ...base, ...overrides };
}

test("free Scan data does not include paid program names", () => {
  const data = researchToReportData({
    research: sampleResearch(),
    reportId: "rid",
    offerMode: "SCAN_UPSELL",
    checkoutUrl: "https://buy.stripe.com/test",
  });
  const scanText = JSON.stringify(data.freeScan);
  assert.equal(scanText.includes("Secret Youth Passport"), false);
  assert.equal(scanText.includes("https://example.com/passport"), false);
  assert.equal(data.opportunities[0]?.title, "Secret Youth Passport");
  assert.equal(freeScanLeakFlags(data).length, 0);
});

test("FULL_PLAN_FREE omits the $49 CTA from the Scan payload", () => {
  const data = researchToReportData({
    research: sampleResearch(),
    reportId: "rid",
    offerMode: "FULL_PLAN_FREE",
  });
  assert.equal(data.freeScan?.cta, undefined);
  assert.match(String(data.freeScan?.closing), /Hope this helps/);
  assert.doesNotMatch(JSON.stringify(data.freeScan), /keep the exact details in the (full )?Plan/i);
  assert.doesNotMatch(JSON.stringify(data.freeScan), /\$49/);
});

test("SCAN_UPSELL Scan keeps the Plan teaser and refund offer", () => {
  const data = researchToReportData({
    research: sampleResearch(),
    reportId: "rid",
    offerMode: "SCAN_UPSELL",
    checkoutUrl: "https://buy.stripe.com/test_abc",
  });
  assert.match(String(data.freeScan?.findings[0]?.explanation), /I'll keep the exact details in the full Plan/);
  assert.match(String(data.freeScan?.cta?.body), /I'll refund you/);
  assert.equal(data.freeScan?.cta?.price, "$49");
});

test("research leftover prose is not dumped into customer opportunity cards", () => {
  const data = researchToReportData({
    research: sampleResearch(),
    reportId: "rid",
    offerMode: "SCAN_UPSELL",
  });
  assert.equal(data.opportunities[0]?.found, undefined);
  assert.doesNotMatch(JSON.stringify(data.opportunities[0]), /Kids tickets add up/);
  assert.equal(data.opportunities[0]?.title, "Secret Youth Passport");
  assert.equal(data.opportunities[0]?.deadline, "October 15");
  assert.equal(data.opportunities[0]?.source?.url, "https://example.com/passport");
});

test("Scan copy uses founder voice, tiers, and no internal UUID", () => {
  const reportId = "bd9a4d4d-7934-453f-b3f5-3783c5c773b6";
  const data = researchToReportData({
    research: sampleResearch(),
    reportId,
    offerMode: "SCAN_UPSELL",
    checkoutUrl: "https://buy.stripe.com/test_abc",
  });
  assert.equal(data.summary.jackpotCount, 1);
  assert.equal(data.summary.strongCount, 0);
  assert.equal(data.freeScan?.findings.length, 1);
  assert.equal(data.freeScan?.findings[0]?.tier, "jackpot");
  assert.match(String(data.freeScan?.opening), /Howdy Ada/);
  assert.match(String(data.freeScan?.myTake), /If I were in your shoes/);
  assert.match(String(data.freeScan?.cta?.body), /I'll refund you/);
  assert.equal(data.freeScan?.cta?.url, "https://buy.stripe.com/test_abc");
  assert.doesNotMatch(JSON.stringify(data.freeScan), new RegExp(reportId));
  assert.doesNotMatch(JSON.stringify(data.freeScan), /\u2014/);
  assert.equal(freeScanLeakFlags({ ...data, report: { ...data.report, reportId } }).length, 0);
});
