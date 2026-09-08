import assert from "node:assert/strict";
import { test } from "node:test";
import { isPlanDetailTeaser, writingVoiceIssues } from "../lib/copy/banned.ts";
import { displayCostPair, formatCustomerRange } from "../lib/research/money.ts";

test("flags consultant and research-audit phrases", () => {
  const issues = writingVoiceIssues(
    "The family explicitly identified affordability as a constraint. I checked the page on September 7 and it matched the saved research.",
  );
  assert.ok(issues.length >= 2);
});

test("allows normal second-person copy", () => {
  assert.deepEqual(
    writingVoiceIssues("You mentioned that keeping skiing affordable is important. I'd look at Cochran's first."),
    [],
  );
  assert.deepEqual(
    writingVoiceIssues("Compare the family options during the fall sale."),
    [],
  );
});

test("flags Scan teaser language used on a free Plan", () => {
  assert.equal(isPlanDetailTeaser("I'll keep the exact details in the full Plan."), true);
  assert.equal(isPlanDetailTeaser("There's a useful option tied to Winter Park."), false);
});

test("displayed subtraction matches floored savings", () => {
  const pair = displayCostPair(312.7, 106);
  assert.equal(pair.savings, "$206");
  assert.equal(pair.baseline, "$312");
  assert.equal(pair.optimized, "$106");
  assert.equal(formatCustomerRange(206.7, 312.7), "$206-$312");
});
