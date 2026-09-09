import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { finalizeEditorialWriting } from "../lib/copy/editorial.ts";
import { parseReportWriting } from "../lib/copy/writing-schema.ts";
import { summarizeDisplaySavings } from "../lib/research/display-savings.ts";
import { parseResearch, type CanonicalResearch } from "../lib/research/schema.ts";
import { researchToReportData } from "../lib/research/to-report.ts";
import { compileReportCss, generateReport } from "../reports/scripts/render-report.tsx";
import { extractPdf, runChecks } from "../reports/scripts/pdf-qa.ts";
import { mentionsPaidPlanPrice } from "../lib/copy/scan-amounts.ts";

const FIXTURES = path.join(process.cwd(), "tests/fixtures");

function loadResearch(name: string) {
  return parseResearch(JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8")));
}

function writingFor(research: CanonicalResearch) {
  const first = research.family.firstName;
  return parseReportWriting({
    scan: {
      greeting: `Howdy ${first}!`,
      opening: "Thanks for letting me look at your winter and the choices still in front of you.",
      savingsLine: "Placeholder savings line without numbers.",
      findings: [
        {
          heading: "Start with the winter you actually have",
          explanation: "I'd look at the choice that matches how you ski, then skip anything that is only a maybe.",
        },
      ],
      myTake: "I would start with the clearest current-season option, then decide what else is actually on the calendar.",
      questions: [],
      closing: null,
    },
    plan: {
      opening: `Here is where I would start with the season you described, ${first}.`,
      startHereIntro: null,
      startHere: research.paidPlan.startHere.map((step) => ({
        number: step.number,
        title: step.title,
        description: step.description,
      })),
      myTake: "Start with the open questions, then decide what is actually on the calendar.",
      bottomLine: "Do not add optional ideas onto a number that is not counted.",
      thankYou: "Reply if you want me to check another option.",
      knownSavings: [],
      opportunities: [],
      watchIntro: null,
      watch: [],
    },
    email: {
      observation: "The open questions are the useful place to start.",
      opening: "Thanks for sending this over. I found a few useful checks.",
    },
  });
}

async function renderFixture(name: string) {
  const research = loadResearch(name);
  const display = summarizeDisplaySavings(research);
  const offerMode = display.offer.offerMode;
  const writing = finalizeEditorialWriting(writingFor(research), research, offerMode);
  const data = researchToReportData({
    research,
    reportId: "11111111-1111-4111-8111-111111111111",
    offerMode,
    writing,
    checkoutUrl: offerMode === "SCAN_UPSELL" ? "https://buy.stripe.com/test_preview" : null,
  });
  const css = compileReportCss({ quiet: true });
  const scan = await generateReport({ data, type: "free", css, quietCss: true });
  const plan = await generateReport({ data, type: "full", css, quietCss: true });
  const scanExtracted = await extractPdf(scan.pdfPath);
  const planExtracted = await extractPdf(plan.pdfPath);
  return {
    offerMode,
    data,
    scan,
    plan,
    scanExtracted,
    planExtracted,
    scanChecks: runChecks("free", data, scanExtracted, scanExtracted.pageCount),
    planChecks: runChecks("full", data, planExtracted, planExtracted.pageCount),
  };
}

test("rendered Scan and Plan PDFs stay useful and factually bounded", { timeout: 180_000 }, async () => {
  const counted = await renderFixture("home-mountain-lesson.research.json");
  const optional = await renderFixture("conditional-range-492.research.json");
  const destination = await renderFixture("destination-family.research.json");

  assert.equal(counted.offerMode, "SCAN_UPSELL");
  assert.equal(optional.offerMode, "FULL_PLAN_FREE");
  assert.equal(destination.offerMode, "SCAN_UPSELL");

  for (const result of [counted, optional, destination]) {
    const failed = [...result.scanChecks, ...result.planChecks].filter((check) => !check.ok);
    assert.equal(failed.length, 0, failed.map((check) => check.message).join("; "));
    assert.ok(result.scanExtracted.pageCount >= 1);
    assert.ok(result.planExtracted.pageCount >= 1);
    assert.doesNotMatch(result.scanExtracted.allText, /I'll keep the (exact )?details in the (full )?Plan/i);
    assert.doesNotMatch(result.scanExtracted.allText, /Something worth a look/i);
    assert.match(result.scanExtracted.allText, new RegExp(`Howdy ${result.data.family.firstName}`));
  }

  assert.equal(mentionsPaidPlanPrice(optional.scanExtracted.allText), false);
  assert.equal(mentionsPaidPlanPrice(optional.planExtracted.allText), false);
  assert.match(optional.scanExtracted.allText, /\$76-\$492|\$76 to \$492/);
  assert.ok(counted.data.freeScan?.cta);
  assert.match(counted.scanExtracted.allText, /\$49/);
  assert.doesNotMatch(optional.scanExtracted.allText, /Want the full Savings Plan/);
});
