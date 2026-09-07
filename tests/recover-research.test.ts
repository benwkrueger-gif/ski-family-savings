import assert from "node:assert/strict";
import { test } from "node:test";
import { staleOpenAiResponseReason } from "../lib/pipeline/recover.ts";

test("rejects a completed OpenAI response from a newer research attempt", () => {
  const reason = staleOpenAiResponseReason({
    reportId: "report-1",
    currentResponseId: "resp_new",
    incomingResponseId: "resp_old",
  });
  assert.match(String(reason), /Stale OpenAI response/);
});

test("rejects a response whose metadata belongs to another report", () => {
  const reason = staleOpenAiResponseReason({
    reportId: "report-1",
    currentResponseId: "resp_1",
    incomingResponseId: "resp_1",
    metadataReportId: "report-2",
  });
  assert.match(String(reason), /does not match this report/);
});

test("accepts the current response for the same report", () => {
  const reason = staleOpenAiResponseReason({
    reportId: "report-1",
    currentResponseId: "resp_1",
    incomingResponseId: "resp_1",
    metadataReportId: "report-1",
  });
  assert.equal(reason, null);
});
