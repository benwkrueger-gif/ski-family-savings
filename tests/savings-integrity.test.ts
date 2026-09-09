import assert from "node:assert/strict";
import { test } from "node:test";
import { fieldsFromApi } from "../lib/tally/payload.ts";
import { normalizeTallyAnswers } from "../lib/tally/normalize.ts";
import {
  displayTierFor,
  isFirmlyCountable,
  summarizeDisplaySavings,
} from "../lib/research/display-savings.ts";
import { buildScanFindingSeed, fallbackScanQuestions } from "../lib/copy/scan-findings.ts";
import {
  canCountInHeadline,
  hasUnconfirmedDependents,
  isHypotheticalGearNeed,
  nightAccessStance,
  overlappingPassSavings,
} from "../lib/research/savings-integrity.ts";
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
    sourceCheckedAt: "2026-09-09",
    notes: "",
    location: "Bolton Valley",
    whyItMatters: "",
    howItWorks: "",
    recommendedAction: "",
    ...partial,
  };
}

function researchWith(opportunities: ResearchOpportunity[], destinations = ["Bolton Valley"]): CanonicalResearch {
  return {
    family: {
      firstName: "Ada",
      lastName: null,
      homeZip: "05477",
      adults: 3,
      children: [
        { age: 13, grade: "8th grade" },
        { age: 16, grade: "11th grade" },
        { age: 2, grade: "Preschool/Pre-K" },
      ],
      skiProfile: "Home mountain plus a few other resorts",
      annualDays: "8-15 days",
      destinations,
    },
    summary: {
      coreSavingsLow: 376,
      coreSavingsHigh: 778,
      optionalSavingsLow: 0,
      optionalSavingsHigh: 2500,
      jackpotCount: 2,
      strongCount: 1,
      usefulCount: 0,
      watchCount: 2,
      confidence: "MEDIUM",
      rationale: "test",
      humanReviewFlags: [],
      offerModeRecommendation: "SCAN_UPSELL",
      offerModeReason: "test",
      headlineSavings: "$376",
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
      primaryOpportunityArea: "Home mountain",
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
      bottomLine: "Ask first.",
      closingLine: "Then ski.",
      referralLine: null,
      thankYouHeadline: "Thanks",
      thankYouBody: "Reply if something looks off.",
    },
    emailContext: {
      personalizedObservation: "test",
      enthusiasmLevel: "MEDIUM",
    },
  };
}

const militaryUnknownDependents = opp({
  id: "bolton-military-season-pass-2627",
  name: "Bolton veteran and dependent season-pass discount",
  tier: "JACKPOT",
  category: "Home-mountain season passes",
  familyMembersAffected: ["Army veteran adult", "13-year-old dependent", "16-year-old dependent"],
  eligibility: "Veterans and their dependents qualify. Dependent eligibility is unknown.",
  notes: "The exact military-dependent relationships were not provided.",
  countReason: "Other adults are excluded because military-dependent status is unknown.",
  calculation: "One adult Local Day & Night at $759 plus two youth at $329, then 25%.",
  baselineCost: 1502.02,
  opportunityCost: 1126.52,
  netSavingsLow: 376,
  netSavingsHigh: 778,
  countedInHeadline: true,
  verificationStatus: "HIGH_CONFIDENCE",
});

const daytimeUnknownNight = opp({
  id: "bolton-local-daytime-fit-2627",
  name: "Bolton Local Daytime Hours Pass",
  tier: "STRONG",
  category: "Pass right-sizing",
  restrictions: "No lift access after 4 p.m.",
  notes: "Do not choose this solely to lower the price if the family expects regular evening or night sessions.",
  countReason: "Night-skiing behavior is unknown, so this is a choice-dependent scenario rather than firm savings.",
  baselineCost: 2766.34,
  opportunityCost: 2631.19,
  netSavingsLow: 119,
  netSavingsHigh: 159,
  countedInHeadline: false,
});

const gearUnknownNeed = opp({
  id: "teen-seasonal-equipment-lease-2627",
  name: "Season-long equipment lease",
  tier: "JACKPOT",
  category: "Equipment",
  notes: "Gear ownership is unknown.",
  countReason: "No equipment needs were provided.",
  baselineCost: 881.92,
  opportunityCost: 527.88,
  netSavingsLow: 354,
  netSavingsHigh: 1232,
  countedInHeadline: false,
  verificationStatus: "HIGH_CONFIDENCE",
});

test("Tally affiliations ignore child school-year grades and keep veteran, teacher, and college-student answers", () => {
  const questions = [
    { id: "grade", type: "DROPDOWN", title: "Child 1 grade this school year" },
    { id: "aff", type: "MULTIPLE_CHOICE", title: "Does anyone in your family have an affiliation that might unlock special pricing?" },
    { id: "details", type: "TEXTAREA", title: "Please share applicable details to your selections" },
    { id: "passes", type: "MULTIPLE_CHOICE", title: "Which ski passes or memberships do you already have or expect to use this winter?" },
    { id: "weekdays", type: "MULTIPLE_CHOICE", title: "Can your family ski weekdays?" },
    { id: "known", type: "TEXTAREA", title: "What ski savings, programs or deals do you already know about or plan to use?" },
  ];
  const submission = {
    id: "sub",
    responses: [
      { questionId: "grade", answer: ["8th grade"] },
      { questionId: "aff", answer: ["Military / veteran", "Teacher / educator", "College student"] },
      { questionId: "details", answer: "Army vet, teacher and college student" },
      { questionId: "passes", answer: ["A local resort season pass"] },
      { questionId: "weekdays", answer: ["Sometimes"] },
    ],
  };
  const profile = normalizeTallyAnswers({
    internalId: "rid",
    tallySubmissionId: "sub",
    fields: fieldsFromApi(questions, submission),
  });
  assert.deepEqual(profile.affiliations, [
    "Military / veteran",
    "Teacher / educator",
    "College student",
    "Army vet, teacher and college student",
  ]);
  assert.equal(profile.alreadyKnownSavings, null);
  assert.equal(profile.passesAndMemberships[0], "A local resort season pass");
  assert.equal(profile.weekdayFlexibility, "Sometimes");
});

test("a Bolton family that uses night skiing does not get daytime-only savings counted", () => {
  const required = opp({
    ...daytimeUnknownNight,
    id: "daytime-required",
    countedInHeadline: true,
    notes: "The family regularly uses night skiing after school.",
    countReason: "They need evening access.",
    restrictions: "No lift access after 4 p.m.",
  });
  assert.equal(nightAccessStance(required), "required");
  const research = researchWith([required]);
  assert.equal(isFirmlyCountable(required, research), false);
  assert.equal(summarizeDisplaySavings(research).firmLow, 0);
});

test("a Bolton family that never uses evening access can count a verified daytime-only saving", () => {
  const unused = opp({
    ...daytimeUnknownNight,
    id: "daytime-unused",
    countedInHeadline: true,
    notes: "The family does not ski after 4 p.m. and does not need night access.",
    countReason: "They never ski at night, so daytime hours is equivalent access.",
    restrictions: "No lift access after 4 p.m.",
    netSavingsLow: 80,
    netSavingsHigh: 80,
    baselineCost: 804.54,
    opportunityCost: 724.54,
  });
  assert.equal(nightAccessStance(unused), "unused");
  const research = researchWith([unused]);
  assert.equal(canCountInHeadline(unused, research), true);
  assert.equal(isFirmlyCountable(unused, research), true);
  assert.equal(summarizeDisplaySavings(research).firmLow, 80);
});

test("multiple adults with only one identified veteran do not count unconfirmed adult dependents", () => {
  const veteranOnly = opp({
    ...militaryUnknownDependents,
    id: "veteran-only",
    familyMembersAffected: ["Army veteran adult"],
    eligibility: "The identified veteran qualifies for 25% off a Local pass.",
    notes: "Other adults are not claimed as dependents.",
    countReason: "Counts only the veteran's own pass.",
    baselineCost: 804.54,
    opportunityCost: 603.4,
    netSavingsLow: 201,
    netSavingsHigh: 201,
  });
  const extraAdults = opp({
    ...militaryUnknownDependents,
    id: "extra-adult-dependents",
  });
  assert.equal(hasUnconfirmedDependents(veteranOnly), false);
  assert.equal(hasUnconfirmedDependents(extraAdults), true);
  assert.equal(isFirmlyCountable(veteranOnly, researchWith([veteranOnly])), true);
  assert.equal(isFirmlyCountable(extraAdults, researchWith([extraAdults])), false);
});

test("confirmed military dependents can be counted", () => {
  const confirmed = opp({
    ...militaryUnknownDependents,
    familyMembersAffected: ["Veteran adult", "13-year-old dependent", "16-year-old dependent"],
    eligibility: "Bolton accepted the veteran and both children as confirmed military dependents.",
    notes: "Dependent eligibility is documented.",
    countReason: "Counts the veteran and two confirmed dependents.",
  });
  assert.equal(hasUnconfirmedDependents(confirmed), false);
  assert.equal(isFirmlyCountable(confirmed, researchWith([confirmed])), true);
  assert.equal(summarizeDisplaySavings(researchWith([confirmed])).firmLow, 376);
});

test("unknown dependent eligibility is excluded from counted totals", () => {
  const research = researchWith([militaryUnknownDependents]);
  assert.equal(hasUnconfirmedDependents(militaryUnknownDependents), true);
  assert.equal(isFirmlyCountable(militaryUnknownDependents, research), false);
  const summary = summarizeDisplaySavings(research);
  assert.equal(summary.firmLow, 0);
  assert.equal(summary.offer.offerMode, "FULL_PLAN_FREE");
  assert.equal(summary.counts.jackpotCount, 0);
  assert.equal(displayTierFor(militaryUnknownDependents, research), "STRONG");
});

test("teens who already own fitting gear are not a counted lease saving", () => {
  const owned = opp({
    ...gearUnknownNeed,
    countedInHeadline: true,
    notes: "Both teens already own fitting gear, so a lease is not a saving.",
    countReason: "Owned equipment replaces the rental baseline.",
    netSavingsLow: 0,
    netSavingsHigh: 0,
  });
  assert.equal(isFirmlyCountable(owned, researchWith([owned])), false);
  assert.equal(summarizeDisplaySavings(researchWith([owned])).firmLow, 0);
});

test("teens who need equipment can keep a realistic rental baseline", () => {
  const needed = opp({
    ...gearUnknownNeed,
    countedInHeadline: true,
    notes: "Both teens need full equipment and currently rent daily.",
    countReason: "Compares the season lease with their stated daily rental plan.",
    netSavingsLow: 200,
    netSavingsHigh: 200,
    baselineCost: 700,
    opportunityCost: 500,
  });
  assert.equal(isHypotheticalGearNeed(needed), false);
  assert.equal(isFirmlyCountable(needed, researchWith([needed])), true);
  assert.equal(summarizeDisplaySavings(researchWith([needed])).firmLow, 200);
});

test("an ambiguously described college student stays uncounted and unnamed as a new family member", () => {
  const college = opp({
    id: "bolton-young-adult-age-check-2627",
    name: "Bolton youth and young adult pass category",
    tier: "WATCH",
    category: "Age-based pass pricing",
    familyMembersAffected: ["College-student adult, identity and age unknown"],
    notes: "The identity of the college student is unknown.",
    countReason: "The college student's age and identity are unknown.",
    verificationStatus: "NEEDS_CHECK",
    countedInHeadline: false,
    netSavingsLow: 0,
    netSavingsHigh: 456,
  });
  const research = researchWith([college]);
  const summary = summarizeDisplaySavings(research);
  assert.equal(summary.firmLow, 0);
  assert.equal(summary.counts.watchCount, 1);
  assert.equal(research.family.adults, 3);
  assert.equal(research.family.children.length, 3);
});

test("overlapping military and daytime pass savings are not added together", () => {
  const military = opp({
    ...militaryUnknownDependents,
    familyMembersAffected: ["Veteran adult", "13-year-old dependent", "16-year-old dependent"],
    eligibility: "Bolton accepted the veteran and both children as confirmed military dependents.",
    notes: "Dependent eligibility is documented.",
    countReason: "Counts the veteran and two confirmed dependents.",
    netSavingsHigh: 376,
  });
  const daytime = opp({
    ...daytimeUnknownNight,
    countedInHeadline: true,
    notes: "The family does not ski after 4 p.m. and does not need night access.",
    countReason: "They never ski at night, so daytime hours is equivalent access.",
    restrictions: "No lift access after 4 p.m.",
    netSavingsLow: 80,
    netSavingsHigh: 80,
    baselineCost: 804.54,
    opportunityCost: 724.54,
  });
  assert.equal(overlappingPassSavings(military, daytime), true);
  assert.equal(isFirmlyCountable(military, researchWith([military])), true);
  assert.equal(isFirmlyCountable(daytime, researchWith([daytime])), true);
  const summary = summarizeDisplaySavings(researchWith([military, daytime]));
  assert.equal(summary.firmLow, 376);
  assert.equal(summary.firmHigh, 376);
  assert.ok(summary.firmLow < 376 + 80);
});

test("a price range with multiple counted opportunities still reconciles", () => {
  const a = opp({
    id: "a",
    tier: "STRONG",
    netSavingsLow: 80,
    netSavingsHigh: 80,
    baselineCost: 200,
    opportunityCost: 120,
    location: "Bolton Valley",
  });
  const b = opp({
    id: "b",
    tier: "STRONG",
    netSavingsLow: 40,
    netSavingsHigh: 40,
    baselineCost: 100,
    opportunityCost: 60,
    location: "Smugglers' Notch",
    category: "Travel tickets",
    name: "Advance tickets",
  });
  const summary = summarizeDisplaySavings(researchWith([a, b]));
  assert.equal(summary.firmLow, 120);
  assert.equal(summary.firmHigh, 120);
  assert.equal(summary.offer.offerMode, "SCAN_UPSELL");
});

test("old Katie-style output would have counted unsupported military and Jackpot gear; it no longer does", () => {
  const research = researchWith([militaryUnknownDependents, daytimeUnknownNight, gearUnknownNeed]);
  const summary = summarizeDisplaySavings(research);
  assert.equal(isFirmlyCountable(militaryUnknownDependents, research), false);
  assert.equal(displayTierFor(gearUnknownNeed, research), "STRONG");
  assert.equal(displayTierFor(daytimeUnknownNight, research), "STRONG");
  assert.equal(summary.firmLow, 0);
  assert.equal(summary.firmHigh, 0);
  assert.equal(summary.counts.jackpotCount, 0);
  assert.equal(summary.offer.offerMode, "FULL_PLAN_FREE");
  assert.notEqual(summary.headlineSavings, "$376");
  const militarySeed = buildScanFindingSeed(
    summary.opportunities.find((item) => item.opportunity.id === militaryUnknownDependents.id)!,
    research,
  );
  assert.equal(militarySeed.opportunityType, "affiliation pass");
  assert.doesNotMatch(militarySeed.whyItMatters, /kids' season access/i);
  const questions = fallbackScanQuestions(research, summary);
  assert.equal(
    questions.some((question) => /night skiing, including after-school or evening trips/i.test(question)),
    true,
  );
});
