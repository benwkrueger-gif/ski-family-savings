import assert from "node:assert/strict";
import { test } from "node:test";
import { runChecks, type ExtractedPdf } from "../reports/scripts/pdf-qa.ts";
import { parseReport } from "../reports/schema.ts";

const sample = parseReport({
  report: { generatedDate: "September 7, 2026", reportId: "11111111-1111-4111-8111-111111111111" },
  family: { firstName: "Ada", children: [], destinations: [] },
  summary: { headlineSavings: "$250", headline: "I found roughly $250." },
  opportunities: [{ tier: "jackpot", title: "Youth Passport", sources: [] }],
  thankYou: { enabled: true, headline: "Hope this helps, Ada." },
});

test("QA flags empty extra pages, UUID leaks, and robotic language", () => {
  const extracted: ExtractedPdf = {
    pageCount: 2,
    pages: [
      { text: "Howdy Ada! I found roughly $250.", urls: [] },
      { text: "   ", urls: [] },
    ],
    allText: "Howdy Ada! I found roughly $250. The family explicitly identified affordability.",
    allUrls: [],
  };
  const checks = runChecks("free", sample, extracted, 2);
  assert.equal(checks.some((check) => !check.ok && /empty pages/i.test(check.message)), true);
  assert.equal(checks.some((check) => !check.ok && /UUID/i.test(check.message)), false);
  extracted.allText += " 11111111-1111-4111-8111-111111111111";
  const leaked = runChecks("free", sample, extracted, 2);
  assert.equal(leaked.some((check) => !check.ok && /UUID/i.test(check.message)), true);
  assert.equal(leaked.some((check) => !check.ok && /voice flags/i.test(check.message)), true);
});

test("FULL_PLAN_FREE PDFs should not contain $49", () => {
  const extracted: ExtractedPdf = {
    pageCount: 1,
    pages: [{ text: "Hope this helps. The Plan is $49.", urls: [] }],
    allText: "Hope this helps. The Plan is $49.",
    allUrls: [],
  };
  const checks = runChecks("free", { ...sample, freeScan: undefined }, extracted, 1);
  assert.equal(checks.some((check) => !check.ok && /\$49/.test(check.message)), true);
});

test("FULL_PLAN_FREE PDFs may mention $492 optional savings", () => {
  const extracted: ExtractedPdf = {
    pageCount: 1,
    pages: [{ text: "If a couple things still go your way, it could be about $76-$492.", urls: [] }],
    allText: "If a couple things still go your way, it could be about $76-$492.",
    allUrls: [],
  };
  const checks = runChecks("free", { ...sample, freeScan: undefined }, extracted, 1);
  assert.equal(checks.some((check) => !check.ok && /\$49/.test(check.message)), false);
});
