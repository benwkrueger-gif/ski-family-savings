import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  decideRateLimitRetry,
  estimatedTpmReservation,
  parseTpmRateLimit,
} from "../lib/openai/rate-limit.ts";
import {
  buildResearchInputText,
  GPT56_DEFAULT_MAX_OUTPUT_TOKENS,
  parseResearchOutputText,
  RESEARCH_MAX_OUTPUT_TOKENS,
} from "../lib/openai/research.ts";
import { canLaunchResearch, MAX_ACTIVE_RESEARCH_JOBS } from "../lib/pipeline/research-capacity.ts";
import { compactTallyAnswersForResearch } from "../lib/tally/payload.ts";
import type { FamilyProfile } from "../lib/family/profile.ts";

const profile: FamilyProfile = {
  internalId: "report-1",
  tallySubmissionId: "tally-1",
  firstName: "Jill",
  email: "jill@example.com",
  homeZip: "80424",
  adultsCount: 2,
  children: [{ age: 8, grade: "3rd" }],
  skiingStyle: "weekend",
  typicalSkiDays: "10-15",
  likelyDestinations: ["Breckenridge"],
  passesAndMemberships: [],
  requestedSavingsCategories: ["passes"],
  weekdayFlexibility: "some",
  affiliations: [],
  expectedSpend: null,
  alreadyKnownSavings: null,
  additionalNotes: "Prefers mornings",
};

const rawTally = {
  data: {
    fields: [
      {
        key: "name",
        label: "First name",
        type: "INPUT_TEXT",
        value: "Jill",
        options: [
          { id: "unused-1", text: "A long unused option that used to bloat the prompt" },
          { id: "unused-2", text: "Another unused choice" },
        ],
      },
      {
        key: "mountain",
        label: "Where will you ski",
        type: "MULTIPLE_CHOICE",
        value: "opt-b",
        options: [
          { id: "opt-a", text: "Vail" },
          { id: "opt-b", text: "Breckenridge" },
        ],
      },
    ],
  },
};

test("research request drops duplicated Tally options and pretty-printed raw JSON", () => {
  const input = buildResearchInputText({ profile, rawTallyJson: rawTally });
  const compact = compactTallyAnswersForResearch(rawTally);
  assert.equal(compact[1]?.value, "Breckenridge");
  assert.doesNotMatch(input, /unused-1|A long unused option/);
  assert.doesNotMatch(input, /"options":/);
  assert.doesNotMatch(input, /Raw Tally answers/);
  assert.match(input, /Normalized family profile/);
  assert.match(input, /Breckenridge/);
  const beforeChars =
    JSON.stringify(profile, null, 2).length + JSON.stringify(rawTally, null, 2).length;
  assert.ok(input.length < beforeChars);
});

test("token reservation uses a bounded output limit instead of the 128k default", () => {
  const sop = fs.readFileSync(path.join(process.cwd(), "prompts/research-sop.md"), "utf8");
  const input = buildResearchInputText({ profile, rawTallyJson: rawTally });
  const inputChars = sop.length + input.length + 8000;
  const before = estimatedTpmReservation({
    inputChars,
    maxOutputTokens: GPT56_DEFAULT_MAX_OUTPUT_TOKENS,
  });
  const after = estimatedTpmReservation({
    inputChars,
    maxOutputTokens: RESEARCH_MAX_OUTPUT_TOKENS,
  });
  assert.equal(before, 128_000);
  assert.equal(after, RESEARCH_MAX_OUTPUT_TOKENS);
  assert.ok(after < 50_000);
  assert.ok(after < before);
  const source = fs.readFileSync(path.join(process.cwd(), "lib/openai/research.ts"), "utf8");
  assert.match(source, /max_output_tokens: RESEARCH_MAX_OUTPUT_TOKENS/);
  assert.match(source, /reasoning: \{ effort: "high"/);
  assert.match(source, /maxRetries: 0/);
});

test("rate-limit retries wait for retry-after and never retry an oversized request", () => {
  const parsed = parseTpmRateLimit({
    message:
      "Rate limit reached for gpt-5.6-sol in organization org-test on tokens per min (TPM): Limit 500000, Used 445079, Requested 114548. Please try again in 7.155s.",
    headers: new Headers({ "retry-after": "7.155", "x-ratelimit-limit-tokens": "500000" }),
  });
  assert.equal(parsed.limit, 500000);
  assert.equal(parsed.used, 445079);
  assert.equal(parsed.requested, 114548);
  assert.equal(parsed.retryAfterSeconds, 7.155);

  const wait = decideRateLimitRetry({ attempt: 0, ...parsed });
  assert.equal(wait.action, "wait");
  if (wait.action === "wait") {
    assert.ok(wait.ms >= 7155);
    assert.ok(wait.ms <= 30_000);
  }

  const oversized = decideRateLimitRetry({
    attempt: 0,
    limit: 50_000,
    used: 0,
    requested: 114_548,
    retryAfterSeconds: 1,
  });
  assert.equal(oversized.action, "fail_oversized");

  const exhausted = decideRateLimitRetry({
    attempt: 2,
    limit: 500_000,
    used: 445_079,
    requested: 114_548,
    retryAfterSeconds: 7,
  });
  assert.equal(exhausted.action, "fail");
});

test("only one research job can launch at a time", () => {
  assert.equal(MAX_ACTIVE_RESEARCH_JOBS, 1);
  assert.equal(canLaunchResearch(0), true);
  assert.equal(canLaunchResearch(1), false);
  assert.equal(canLaunchResearch(2), false);
  const runSelected = fs.readFileSync(
    path.join(process.cwd(), "app/api/admin/reports/run-selected/route.ts"),
    "utf8",
  );
  const startResearch = fs.readFileSync(path.join(process.cwd(), "lib/pipeline/research.ts"), "utf8");
  assert.match(runSelected, /for \(const id of ids\)/);
  assert.match(startResearch, /waiting_for_capacity/);
  assert.match(startResearch, /listActiveResearchReports/);
});

test("failed OpenAI responses still yield canonical research when output_text is valid", () => {
  const fixture = fs.readFileSync(
    path.join(process.cwd(), "tests/fixtures/destination-family.research.json"),
    "utf8",
  );
  const research = parseResearchOutputText(fixture);
  assert.equal(research?.family.firstName, "Maya");
  assert.equal(parseResearchOutputText(""), undefined);
  assert.equal(parseResearchOutputText("{not json"), undefined);
});
