import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { assertSameCustomer, emailsMatch } from "../lib/identity.ts";
import { decidePaidSend } from "../lib/pipeline/fulfillment.ts";
import { sessionLooksPaid } from "../lib/stripe/session.ts";

test("fulfillment maps Stripe client_reference_id to the internal report id", () => {
  const reportId = "11111111-1111-4111-8111-111111111111";
  const check = assertSameCustomer({
    internalId: reportId,
    email: "ada@example.com",
    planReportId: reportId,
    planCustomerEmail: "ada@example.com",
    stripeClientReferenceId: reportId,
  });
  assert.equal(check.ok, true);
});

test("wrong client_reference_id does not fulfill", () => {
  const check = assertSameCustomer({
    internalId: "11111111-1111-4111-8111-111111111111",
    email: "ada@example.com",
    planReportId: "11111111-1111-4111-8111-111111111111",
    planCustomerEmail: "ada@example.com",
    stripeClientReferenceId: "22222222-2222-4222-8222-222222222222",
  });
  assert.equal(check.ok, false);
  assert.match(check.mismatches.join(" "), /does not match report/);
});

test("plan belonging to another report is rejected", () => {
  const check = assertSameCustomer({
    internalId: "aaa",
    email: "ada@example.com",
    planReportId: "bbb",
    planCustomerEmail: "ada@example.com",
    stripeClientReferenceId: "aaa",
  });
  assert.equal(check.ok, false);
});

test("email mismatch is rejected", () => {
  const check = assertSameCustomer({
    internalId: "aaa",
    email: "ada@example.com",
    planReportId: "aaa",
    planCustomerEmail: "other@example.com",
    stripeClientReferenceId: "aaa",
  });
  assert.equal(check.ok, false);
});

test("emailsMatch is case-insensitive", () => {
  assert.equal(emailsMatch("Ada@Example.com", "ada@example.com"), true);
});

test("unpaid sessions are not treated as paid", () => {
  assert.equal(sessionLooksPaid({ id: "cs_1", payment_status: "unpaid" }), false);
  assert.equal(sessionLooksPaid({ id: "cs_1", payment_status: "unpaid", status: "complete" }), false);
  assert.equal(sessionLooksPaid({ id: "cs_1", status: "complete" }), false);
  assert.equal(sessionLooksPaid({ id: "cs_1", payment_status: "paid" }), true);
});

test("uncertain in-flight delivery is not resent", () => {
  assert.equal(
    decidePaidSend({ paid: false, alreadyFulfilled: false }).action,
    "skip",
  );
  assert.equal(
    decidePaidSend({ paid: true, alreadyFulfilled: true }).reason,
    "already fulfilled",
  );
  assert.deepEqual(
    decidePaidSend({
      paid: true,
      alreadyFulfilled: false,
      gmailPaidMessageId: "msg_1",
    }),
    { action: "recover", messageId: "msg_1" },
  );
  assert.deepEqual(
    decidePaidSend({
      paid: true,
      alreadyFulfilled: false,
      status: "PLAN_DELIVERING",
      recoveredMessageId: "msg_recovered",
    }),
    { action: "recover", messageId: "msg_recovered" },
  );
  assert.equal(
    decidePaidSend({
      paid: true,
      alreadyFulfilled: false,
      status: "PLAN_DELIVERING",
      recoveredMessageId: "search-failed",
    }).reason,
    "delivery uncertain; not resending",
  );
  assert.equal(
    decidePaidSend({
      paid: true,
      alreadyFulfilled: false,
      status: "PLAN_DELIVERY_FAILED",
      recoveredMessageId: "search-failed",
    }).reason,
    "delivery uncertain; not resending",
  );
  assert.equal(
    decidePaidSend({
      paid: true,
      alreadyFulfilled: false,
      status: "PLAN_DELIVERING",
      recoveredMessageId: null,
    }).action,
    "send",
  );
});

test("duplicate Stripe events still run idempotent fulfillment and keep in-flight status", () => {
  const webhook = fs.readFileSync(path.join(process.cwd(), "app/api/webhooks/stripe/route.ts"), "utf8");
  const afterClaim = webhook.split('log.info("stripe_webhook_duplicate_event"')[1] ?? "";
  assert.match(webhook, /PLAN_DELIVERING/);
  assert.match(webhook, /PLAN_DELIVERY_FAILED/);
  assert.match(afterClaim, /await fulfillPaidPlan/);
  assert.doesNotMatch(afterClaim.split("await fulfillPaidPlan")[0] ?? "", /return new Response\("ok"/);
});
