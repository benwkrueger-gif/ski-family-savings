import assert from "node:assert/strict";
import { test } from "node:test";
import { stripeEventMatchesSecretMode, stripeSecretIsLive } from "../lib/stripe/client.ts";
import { buildSavingsPlanCheckoutUrl } from "../lib/stripe/checkout.ts";

test("builds a unique checkout URL with internal id and locked email", () => {
  const url = buildSavingsPlanCheckoutUrl({
    paymentLink: "https://buy.stripe.com/test_abc",
    internalId: "11111111-1111-4111-8111-111111111111",
    email: "ada+ski@example.com",
  });
  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, "https://buy.stripe.com/test_abc");
  assert.equal(parsed.searchParams.get("client_reference_id"), "11111111-1111-4111-8111-111111111111");
  assert.equal(parsed.searchParams.get("locked_prefilled_email"), "ada+ski@example.com");
});

test("Stripe test and live modes cannot cross", () => {
  assert.equal(stripeSecretIsLive("sk_test_abc"), false);
  assert.equal(stripeSecretIsLive("sk_live_abc"), true);
  assert.equal(stripeEventMatchesSecretMode(false, "sk_test_abc"), true);
  assert.equal(stripeEventMatchesSecretMode(true, "sk_test_abc"), false);
  assert.equal(stripeEventMatchesSecretMode(true, "sk_live_abc"), true);
  assert.equal(stripeEventMatchesSecretMode(false, "sk_live_abc"), false);
});
