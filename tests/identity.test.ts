import assert from "node:assert/strict";
import { test } from "node:test";
import { assertSameCustomer, emailsMatch } from "../lib/identity.ts";
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
