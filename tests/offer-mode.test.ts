import assert from "node:assert/strict";
import { test } from "node:test";
import { decideOfferMode } from "../lib/research/offer-mode.ts";

test("SCAN_UPSELL when conservative core savings meet the threshold", () => {
  const decision = decideOfferMode({
    coreSavingsLow: 150,
    confidence: "MEDIUM",
    countableOpportunityCount: 1,
    compellingMin: 100,
  });
  assert.equal(decision.offerMode, "SCAN_UPSELL");
});

test("FULL_PLAN_FREE when conservative core savings are below the threshold", () => {
  const decision = decideOfferMode({
    coreSavingsLow: 80,
    confidence: "HIGH",
    countableOpportunityCount: 2,
    compellingMin: 100,
  });
  assert.equal(decision.offerMode, "FULL_PLAN_FREE");
  assert.match(decision.reason, /below the \$100 threshold/);
});

test("FULL_PLAN_FREE when confidence is LOW even if savings are high", () => {
  const decision = decideOfferMode({
    coreSavingsLow: 400,
    confidence: "LOW",
    countableOpportunityCount: 2,
    compellingMin: 100,
  });
  assert.equal(decision.offerMode, "FULL_PLAN_FREE");
});

test("FULL_PLAN_FREE when there is no countable opportunity", () => {
  const decision = decideOfferMode({
    coreSavingsLow: 200,
    confidence: "HIGH",
    countableOpportunityCount: 0,
    compellingMin: 100,
  });
  assert.equal(decision.offerMode, "FULL_PLAN_FREE");
});

test("changing COMPELLING_SAVINGS_MIN flips offer mode", () => {
  const input = {
    coreSavingsLow: 150,
    confidence: "HIGH" as const,
    countableOpportunityCount: 1,
  };
  assert.equal(decideOfferMode({ ...input, compellingMin: 100 }).offerMode, "SCAN_UPSELL");
  assert.equal(decideOfferMode({ ...input, compellingMin: 200 }).offerMode, "FULL_PLAN_FREE");
});

test("does not use the optimistic high estimate", () => {
  const decision = decideOfferMode({
    coreSavingsLow: 40,
    confidence: "HIGH",
    countableOpportunityCount: 3,
    compellingMin: 100,
  });
  assert.equal(decision.offerMode, "FULL_PLAN_FREE");
});
