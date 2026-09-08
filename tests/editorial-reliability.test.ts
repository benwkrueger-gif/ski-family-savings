import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calendarDateFacts,
  expiredPriceFact,
  repairCopyPunctuation,
  repairEditorialWriting,
  scanDollarIssues,
  scanPaidContentIssues,
} from "../lib/copy/editorial.ts";
import { parseReportWriting } from "../lib/copy/writing-schema.ts";
import type { CanonicalResearch } from "../lib/research/schema.ts";

function writing() {
  return parseReportWriting({
    scan: {
      greeting: "Howdy Ada!",
      opening: "Thanks for letting me look at your winter plans.",
      savingsLine: "I found $50 in firm savings.",
      findings: [
        {
          heading: "A useful child option",
          explanation: "There is a useful child-access option at your home mountain.",
        },
      ],
      myTake: "I would handle the child-access step first, then confirm current family pricing.",
      questions: [],
      closing: "Hope this helps.",
    },
    plan: {
      opening: "Here is where I would start with the season you described.",
      startHereIntro: null,
      startHere: [
        {
          number: 1,
          title: "Handle the child option",
          description: "Create the account and upload the required proof.",
        },
      ],
      myTake: "Start with the child benefit and confirm current prices before buying anything else.",
      bottomLine: "Handle the verified child benefit first.",
      thankYou: "Reply if you want me to check another option.",
      knownSavings: [],
      opportunities: [
        {
          id: "fifth-grade-option",
          found: "The child qualifies for the current grade-based benefit.",
          saveNote: "$50 in verified savings at the home mountain.",
          action: "Create the account and submit the required proof.",
          catchNote: null,
          timingNote: null,
          scenarioNotes: [],
        },
      ],
      watchIntro: null,
      watch: [],
    },
    email: {
      observation: "A fifth grader at the home mountain made this worth checking.",
      opening: "Thanks for sending this over. I found one useful first step.",
    },
  });
}

function researchForRepair(): CanonicalResearch {
  return {
    family: {
      firstName: "Ada",
      lastName: null,
      homeZip: null,
      adults: 2,
      children: [{ age: 10, grade: "5th" }],
      skiProfile: null,
      annualDays: null,
      destinations: ["Home Mountain"],
    },
    paidPlan: {
      overview: "",
      startHere: [
        {
          number: 1,
          title: "Handle the child option",
          description:
            "Create the account, upload proof of fifth grade, and purchase after sales open at noon on September 9, 2026.",
          sourceTitle: "Official instructions",
          sourceUrl: "https://example.com",
        },
      ],
      optionalScenarios: [],
      alreadyDoingRight: [],
      bottomLine: "",
      closingLine: "",
      referralLine: null,
      thankYouHeadline: "",
      thankYouBody: "",
    },
    opportunities: [
      {
        id: "fifth-grade-option",
        name: "Fifth Grade Option",
        category: "Youth access",
        tier: "STRONG",
        familyMembersAffected: ["Child"],
        eligibility: "Current fifth graders",
        familyFit: "The child is in fifth grade.",
        baselineCost: 90,
        opportunityCost: 40,
        netSavingsLow: 50,
        netSavingsHigh: 50,
        calculation: "$90 - $40 = $50",
        deadline: "Sales open September 9, 2026 at 12:00 p.m.",
        restrictions: null,
        blackoutDates: null,
        stackability: "",
        alreadyKnownByFamily: false,
        verificationStatus: "VERIFIED",
        countedInHeadline: true,
        countReason: "Current verified program",
        sourceUrl: "https://example.com",
        sourceTitle: "Official instructions",
        sourceCheckedAt: "2026-09-08",
        notes: "",
        location: "Home Mountain",
        whyItMatters: "",
        howItWorks: "",
        recommendedAction: "",
      },
    ],
    summary: {
      coreSavingsLow: 50,
      coreSavingsHigh: 50,
      optionalSavingsLow: 0,
      optionalSavingsHigh: 0,
      jackpotCount: 0,
      strongCount: 1,
      usefulCount: 0,
      watchCount: 0,
      confidence: "HIGH",
      rationale: "",
      humanReviewFlags: [],
      offerModeRecommendation: "FULL_PLAN_FREE",
      offerModeReason: "",
      headlineSavings: "$50",
      headline: "",
      subhead: "",
    },
    scenarioGroups: [],
    existingKnownSavings: [],
    watchlist: [],
    freeScan: {
      headline: "",
      summaryText: "",
      primaryOpportunityArea: "",
      opportunityAreas: [],
      biggestPotentialWin: null,
      biggestPotentialWinLabel: "",
      unknownsIntro: "",
      importantUnknowns: [],
      ctaHeadline: "",
      ctaBody: "",
      methodologyTitle: "",
      methodologyText: "",
    },
    emailContext: {
      personalizedObservation: "",
      enthusiasmLevel: "MEDIUM",
    },
  };
}

test("Scan allows approved high-level estimates but rejects paid-detail amounts", () => {
  assert.deepEqual(
    scanDollarIssues({
      scanText: "I found $50, with $0-$750 still conditional.",
      approvedSavings: ["$50", "$0-$750"],
    }),
    [],
  );
  assert.deepEqual(
    scanDollarIssues({
      scanText: "The product costs $40 and saves $50.",
      approvedSavings: ["$50"],
    }),
    ["Scan copy includes unapproved paid-detail amount $40"],
  );
});

test("mandatory Plan dates are restored deterministically", () => {
  const repaired = repairEditorialWriting(writing(), researchForRepair());
  assert.match(repaired.plan.startHere[0]!.description, /September 9, 2026/);
  assert.match(repaired.plan.opportunities[0]!.timingNote ?? "", /September 9, 2026/);
});

test("Scan paid-detail guard rejects program mechanics and deadlines", () => {
  const research = researchForRepair();
  const issues = scanPaidContentIssues(
    "The Fifth Grade Passport includes three vouchers. Sales open September 9, 2026.",
    research,
  );
  assert.ok(issues.some((issue) => /program mechanics/i.test(issue)));
  assert.ok(issues.some((issue) => /deadline/i.test(issue)));
});

test("unsafe Scan detail is replaced with a high-level finding", () => {
  const unsafe = writing();
  unsafe.scan.findings[0]!.explanation =
    "The passport includes three vouchers and sales open September 9, 2026.";
  const repaired = repairEditorialWriting(unsafe, researchForRepair());
  assert.doesNotMatch(repaired.scan.findings[0]!.explanation, /passport|voucher|September 9/i);
});

test("cosmetic missing comma spaces are repaired without changing thousands", () => {
  assert.equal(
    repairCopyPunctuation("Create the account,upload proof, and compare $1,000."),
    "Create the account, upload proof, and compare $1,000.",
  );
});

test("expired price tiers are detected after their stated date", () => {
  const fact = "The displayed badge prices were valid only through September 7, 2026.";
  assert.equal(expiredPriceFact(fact, new Date("2026-09-08T12:00:00Z")), "September 7, 2026");
  assert.equal(expiredPriceFact(fact, new Date("2026-09-07T12:00:00Z")), null);
});

test("calendar facts include the exact mandatory date", () => {
  assert.deepEqual(calendarDateFacts("Sales open September 9, 2026 at noon."), [
    "September 9, 2026",
  ]);
});
