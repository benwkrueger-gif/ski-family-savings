import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  editorialQualityIssues,
  finalizeEditorialWriting,
  repairEditorialWriting,
} from "../lib/copy/editorial.ts";
import { parseReportWriting } from "../lib/copy/writing-schema.ts";
import { summarizeDisplaySavings } from "../lib/research/display-savings.ts";
import { parseResearch } from "../lib/research/schema.ts";
import {
  freeScanLeakFlags,
  researchToReportData,
} from "../lib/research/to-report.ts";

const research = parseResearch(
  JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "tests/fixtures/optional-family.research.json"),
      "utf8",
    ),
  ),
);

function sparseWriting() {
  return parseReportWriting({
    scan: {
      greeting: "Howdy Riley!",
      opening: "Thanks for letting me look at your season and the choices still in front of you.",
      savingsLine: "Nothing is firm yet, but up to $600 remains conditional.",
      findings: [
        {
          heading: "A few choices to confirm",
          explanation: "The pass and equipment decisions are the useful places to start.",
        },
      ],
      myTake: "I would settle the pass question first, then decide what equipment is actually needed.",
      questions: [],
      closing: "Hope this helps.",
    },
    plan: {
      opening: "Here is where I would start with the season you described.",
      startHereIntro: null,
      startHere: [],
      myTake: "Confirm what is already owned before spending money on another option.",
      bottomLine: "Nothing is counted until the open questions are answered.",
      thankYou: "Reply if you want me to check another option.",
      knownSavings: [],
      opportunities: [
        {
          id: "child-season-equipment-lease",
          found: "A season lease may fit if properly fitting equipment is still needed.",
          saveNote: "The possible range remains uncounted until current pricing is confirmed.",
          action: "Confirm owned gear, current price, safe fit, and inventory before paying.",
          catchNote: "Current price and equipment ownership are unknown.",
          timingNote: null,
          scenarioNotes: [],
        },
      ],
      watchIntro: null,
      watch: [],
    },
    email: {
      observation: "The equipment choice is the biggest open question.",
      opening: "Thanks for sending this over. I found a few useful checks.",
    },
  });
}

test("no-firm-savings research remains FULL_PLAN_FREE", () => {
  const display = summarizeDisplaySavings(research);
  assert.equal(display.firmLow, 0);
  assert.equal(display.offer.offerMode, "FULL_PLAN_FREE");
});

test("optional and Watch opportunities do not require model prose", () => {
  const writing = repairEditorialWriting(sparseWriting(), research, "FULL_PLAN_FREE");
  const issues = editorialQualityIssues({
    writing,
    research,
    offerMode: "FULL_PLAN_FREE",
  });
  assert.equal(
    issues.some((issue) => /missing writing for bolton-adult-pass-tier|missing writing for local-2026-ski-swaps/.test(issue)),
    false,
  );

  const data = researchToReportData({
    research,
    reportId: "optional-family",
    offerMode: "FULL_PLAN_FREE",
    writing,
  });
  const watch = data.opportunities.find((item) => item.id === "local-2026-ski-swaps");
  assert.ok(watch?.found);
  assert.ok(watch?.saveNote);
  assert.ok(watch?.action);
  assert.match(watch?.saveNote ?? "", /not counted|uncounted/i);
  assert.ok(
    data.strategy.steps.some((step) => /adult pass tier/i.test(step.title)),
    "the already-known adult pass configuration remains in deterministic Start Here",
  );
});

test("FULL_PLAN_FREE uses a deterministic summary Scan instead of teaser prose", () => {
  const modelWriting = sparseWriting();
  modelWriting.scan.findings[0]!.explanation =
    "Buy the $99 lease before October 10, 2026 using https://example.com/secret.";
  const writing = repairEditorialWriting(modelWriting, research, "FULL_PLAN_FREE");
  const data = researchToReportData({
    research,
    reportId: "optional-family",
    offerMode: "FULL_PLAN_FREE",
    writing,
  });
  const scan = JSON.stringify(data.freeScan);
  assert.doesNotMatch(scan, /\$99|October 10|example\.com\/secret/);
  assert.equal(freeScanLeakFlags(data).length, 0);
});

test("SCAN_UPSELL still rejects exact paid details in free Scan", () => {
  const writing = sparseWriting();
  writing.scan.findings[0]!.explanation =
    "Buy the $99 lease before October 10, 2026 using https://example.com/secret.";
  const issues = editorialQualityIssues({
    writing,
    research,
    offerMode: "SCAN_UPSELL",
  });
  assert.ok(issues.some((issue) => /unapproved paid-detail amount \$99/i.test(issue)));
  assert.ok(issues.some((issue) => /deadline|URL|link/i.test(issue)));
});

test("SCAN_UPSELL repairs leaked Scan amounts without another model call", () => {
  const writing = sparseWriting();
  writing.scan.findings[0]!.explanation =
    "Buy the $99 lease before October 10, 2026 using https://example.com/secret.";
  const finalized = finalizeEditorialWriting(writing, research, "SCAN_UPSELL");
  assert.doesNotMatch(JSON.stringify(finalized.scan), /\$99|October 10|example\.com\/secret/);
  assert.equal(finalized.plan.opportunities[0]?.id, "child-season-equipment-lease");
});
