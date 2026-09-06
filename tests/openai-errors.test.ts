import assert from "node:assert/strict";
import { test } from "node:test";
import { formatOpenAiResponseError } from "../lib/openai/research.ts";

test("formats OpenAI code and message for admin display", () => {
  assert.equal(
    formatOpenAiResponseError({
      status: "failed",
      error: {
        code: "credit_balance_exhausted",
        message: "You have no credits remaining.",
      },
    }),
    "credit_balance_exhausted: You have no credits remaining.",
  );
});

test("falls back to incomplete reason and status when error is missing", () => {
  assert.equal(
    formatOpenAiResponseError({
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
    }),
    "incomplete (max_output_tokens)",
  );
  assert.equal(formatOpenAiResponseError({ status: "cancelled" }), "OpenAI response status cancelled");
});
