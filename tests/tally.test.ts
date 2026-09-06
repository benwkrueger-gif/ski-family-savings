import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { verifyTallySignature } from "../lib/tally/signature.ts";
import { fieldsFromWebhook, extractSubmissionId } from "../lib/tally/payload.ts";
import { normalizeTallyAnswers } from "../lib/tally/normalize.ts";

test("rejects missing or invalid Tally signatures", () => {
  const body = '{"eventId":"abc"}';
  const secret = "test-secret";
  assert.equal(verifyTallySignature(body, null, secret), false);
  assert.equal(verifyTallySignature(body, "nope", secret), false);
});

test("accepts HMAC-SHA256 of the raw body", () => {
  const body = '{"eventId":"abc","data":{"submissionId":"sub_1"}}';
  const secret = "test-secret";
  const signature = createHmac("sha256", secret).update(body).digest("base64");
  assert.equal(verifyTallySignature(body, signature, secret), true);
});

test("normalizes Tally answers by field labels rather than indexes", () => {
  const payload = {
    data: {
      submissionId: "2wgx4n",
      fields: [
        { key: "question_email", label: "Email", type: "INPUT_EMAIL", value: "ada@example.com" },
        { key: "question_name", label: "First name", type: "INPUT_TEXT", value: "Ada" },
        { key: "question_zip", label: "Home ZIP", type: "INPUT_TEXT", value: "05401" },
        { key: "question_days", label: "Typical ski days", type: "DROPDOWN", value: ["a"], options: [{ id: "a", text: "16-30" }] },
      ],
    },
  };
  const profile = normalizeTallyAnswers({
    internalId: "rid",
    tallySubmissionId: extractSubmissionId(payload)!,
    fields: fieldsFromWebhook(payload),
  });
  assert.equal(profile.firstName, "Ada");
  assert.equal(profile.email, "ada@example.com");
  assert.equal(profile.homeZip, "05401");
  assert.equal(profile.typicalSkiDays, "16-30");
  assert.equal(profile.tallySubmissionId, "2wgx4n");
});
