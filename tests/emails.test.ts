import assert from "node:assert/strict";
import { test } from "node:test";
import { assertDraftCopySafe, buildInitialDraftEmail, buildPaidPlanEmail, initialDraftAttachmentKind } from "../lib/copy/emails.ts";

test("SCAN_UPSELL draft attaches scan mode copy and includes checkout URL", () => {
  const email = buildInitialDraftEmail({
    firstName: "Ada",
    offerMode: "SCAN_UPSELL",
    savingsRange: "$250-$400",
    personalizedObservation: "Your Sugarbush plus Breck combo made this a fun one to dig into",
    checkoutUrl: "https://buy.stripe.com/test_abc?client_reference_id=rid",
    coreSavingsLow: 250,
  });
  assert.match(email.body, /Ada/);
  assert.match(email.body, /Savings Scan/);
  assert.match(email.body, /\$49/);
  assert.match(email.body, /buy\.stripe\.com/);
  assert.equal(email.body.includes("\u2014"), false);
  assert.equal(
    assertDraftCopySafe({
      offerMode: "SCAN_UPSELL",
      body: email.body,
      checkoutUrl: "https://buy.stripe.com/test_abc?client_reference_id=rid",
    }).length,
    0,
  );
});

test("FULL_PLAN_FREE draft has no Stripe link or $49 language", () => {
  const email = buildInitialDraftEmail({
    firstName: "Ada",
    offerMode: "FULL_PLAN_FREE",
    savingsRange: "$40-$60",
    personalizedObservation: "Your local pass setup was pretty straightforward",
    coreSavingsLow: 40,
  });
  assert.match(email.body, /full Savings Plan/);
  assert.doesNotMatch(email.body, /\$49/);
  assert.doesNotMatch(email.body, /stripe|checkout/i);
  assert.doesNotMatch(email.body, /wasn't enough to sell|not going to try to sell/i);
  assert.equal(
    assertDraftCopySafe({ offerMode: "FULL_PLAN_FREE", body: email.body }).length,
    0,
  );
});

test("FULL_PLAN_FREE with no firm savings stays honest and still attaches the Plan", () => {
  const email = buildInitialDraftEmail({
    firstName: "Ada",
    offerMode: "FULL_PLAN_FREE",
    savingsRange: "$413-$1,056",
    coreSavingsLow: 0,
  });
  assert.match(email.body, /couldn't lock in a sure number/);
  assert.match(email.body, /full Savings Plan/);
  assert.doesNotMatch(email.body, /\$49/);
  assert.equal(initialDraftAttachmentKind("FULL_PLAN_FREE"), "plan");
  assert.equal(
    assertDraftCopySafe({ offerMode: "FULL_PLAN_FREE", body: email.body }).length,
    0,
  );
});

test("paid plan email is short, first person, and has no em dashes", () => {
  const email = buildPaidPlanEmail({ firstName: "Ada" });
  assert.match(email.subject, /Savings Plan/);
  assert.match(email.body, /Start Here/);
  assert.equal(email.body.includes("\u2014"), false);
  assert.doesNotMatch(email.body, /our team/i);
});
