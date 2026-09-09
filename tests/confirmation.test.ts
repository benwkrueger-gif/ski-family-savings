import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SUBMISSION_CONFIRMATION_SUBJECT,
  buildSubmissionConfirmationEmail,
} from "../lib/copy/emails.ts";
import type { CustomerReport } from "../lib/db/schema.ts";
import {
  sendSubmissionConfirmation,
  shouldAttemptSubmissionConfirmation,
} from "../lib/pipeline/confirmation.ts";

function reportFixture(patch: Partial<CustomerReport> = {}): CustomerReport {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    tallySubmissionId: "submission-1",
    firstName: "Ada",
    email: "ada@example.com",
    source: "webhook",
    confirmationStatus: null,
    gmailConfirmationMessageId: null,
    ...patch,
  } as CustomerReport;
}

test("duplicate webhook delivery does not attempt another confirmation", () => {
  assert.equal(
    shouldAttemptSubmissionConfirmation({
      created: false,
      enabled: true,
      source: "webhook",
    }),
    false,
  );
});

test("historical Tally imports never send confirmations", () => {
  assert.equal(
    shouldAttemptSubmissionConfirmation({
      created: true,
      enabled: true,
      source: "import",
    }),
    false,
  );
});

test("missing first name uses a natural fallback and multipart-safe copy", () => {
  const email = buildSubmissionConfirmationEmail(" \n ");
  assert.equal(email.subject, "I'm digging for your ski savings ⛷️");
  assert.equal(email.subject, SUBMISSION_CONFIRMATION_SUBJECT);
  assert.match(email.body, /^Hey there,\n\nGot your Ski Family Savings Scan submission!/);
  assert.match(email.html, /<p style="margin:0 0 18px;">Hey there,<\/p>/);
  assert.match(email.html, /<p style="margin:0;">Ben<\/p>/);
  assert.doesNotMatch(`${email.body}\n${email.html}`, /\$49|<table|<img|<button/i);
});

test("first name is escaped in HTML and flattened in plain text", () => {
  const email = buildSubmissionConfirmationEmail("Ada <Skier>\nSmith");
  assert.match(email.body, /^Hey Ada <Skier> Smith,/);
  assert.match(email.html, /Hey Ada &lt;Skier&gt; Smith,/);
  assert.doesNotMatch(email.html, /Hey Ada <Skier>/);
});

test("Gmail failure is recorded without rejecting confirmation delivery", async () => {
  const report = reportFixture();
  let uncertainRecorded = false;
  const outcome = await sendSubmissionConfirmation(report, {
    enabled: true,
    dependencies: {
      addLog: async () => undefined,
      claim: async () => reportFixture({ confirmationStatus: "SENDING" }),
      findSent: async () => null,
      markSent: async () => report,
      markUncertain: async () => {
        uncertainRecorded = true;
        return reportFixture({ confirmationStatus: "UNCERTAIN" });
      },
      send: async () => {
        throw new Error("synthetic Gmail failure");
      },
    },
  });

  assert.equal(outcome, "uncertain");
  assert.equal(uncertainRecorded, true);
});

test("an uncertain Gmail result is reconciled but never blindly resent", async () => {
  let sendCount = 0;
  const report = reportFixture({ confirmationStatus: "UNCERTAIN" });
  const outcome = await sendSubmissionConfirmation(report, {
    enabled: true,
    dependencies: {
      addLog: async () => undefined,
      claim: async () => {
        throw new Error("claim should not run");
      },
      findSent: async () => null,
      markSent: async () => report,
      markUncertain: async () => report,
      send: async () => {
        sendCount += 1;
        return "unexpected";
      },
    },
  });

  assert.equal(outcome, "uncertain");
  assert.equal(sendCount, 0);
});
