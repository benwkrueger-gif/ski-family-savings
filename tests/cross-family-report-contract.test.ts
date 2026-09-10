import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { buildInitialDraftEmail, assertDraftCopySafe, initialDraftAttachmentKind } from "../lib/copy/emails.ts";
import {
  editorialQualityIssues,
  finalizeEditorialWriting,
  isNonRetryableWritingMessage,
} from "../lib/copy/editorial.ts";
import { familyMountains, highlightOpportunities } from "../lib/copy/reports.ts";
import { mentionsPaidPlanPrice } from "../lib/copy/scan-amounts.ts";
import { parseReportWriting, type ReportWriting } from "../lib/copy/writing-schema.ts";
import { CRON_RECOVERABLE_RESEARCH_STATUSES, RECOVERABLE_RESEARCH_STATUSES } from "../lib/pipeline/status.ts";
import { summarizeDisplaySavings } from "../lib/research/display-savings.ts";
import { parseResearch, type CanonicalResearch } from "../lib/research/schema.ts";
import { freeScanLeakFlags, researchToReportData } from "../lib/research/to-report.ts";
import { buildSavingsPlanCheckoutUrl } from "../lib/stripe/checkout.ts";

const FIXTURES = path.join(process.cwd(), "tests/fixtures");
const REPORT_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function loadResearch(name: string) {
  return parseResearch(JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8")));
}

function sparseWriting(research: CanonicalResearch): ReportWriting {
  const first = research.family.firstName;
  return parseReportWriting({
    scan: {
      greeting: `Howdy ${first}!`,
      opening: "Thanks for letting me look at your season and the choices still in front of you.",
      savingsLine: "Placeholder savings line without numbers.",
      findings: [
        {
          heading: "Start with the winter you actually have",
          explanation: "I'd look at the choice that matches how you ski, then skip anything that is only a maybe.",
        },
      ],
      myTake: "I would start with the clearest current-season option, then decide what else is actually on the calendar.",
      questions: [],
      closing: "Hope this helps.",
    },
    plan: {
      opening: `Here is where I would start with the season you described, ${first}.`,
      startHereIntro: null,
      startHere: research.paidPlan.startHere.map((step) => ({
        number: step.number,
        title: step.title,
        description: step.description,
      })),
      myTake: "Confirm the open questions before spending money on another option.",
      bottomLine: "Nothing extra should be invented just to fill a box.",
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

function renderPath(research: CanonicalResearch, writing: ReportWriting, offerMode = summarizeDisplaySavings(research).offer.offerMode) {
  const display = summarizeDisplaySavings(research);
  const finalized = finalizeEditorialWriting(writing, research, offerMode);
  const issues = editorialQualityIssues({ writing: finalized, research, offerMode });
  const checkoutUrl =
    offerMode === "SCAN_UPSELL"
      ? buildSavingsPlanCheckoutUrl({
          paymentLink: "https://buy.stripe.com/test_abc",
          internalId: REPORT_ID,
          email: "parent@example.com",
        })
      : null;
  const data = researchToReportData({
    research,
    reportId: REPORT_ID,
    offerMode,
    checkoutUrl,
    writing: finalized,
  });
  const email = buildInitialDraftEmail({
    firstName: research.family.firstName,
    offerMode,
    savingsRange: display.firmLow > 0 ? display.headlineSavings : "",
    checkoutUrl,
    coreSavingsLow: display.firmLow,
    mountains: familyMountains(research),
    findings: finalized.scan.findings.map((finding) => finding.heading),
    programs: highlightOpportunities(display)
      .filter((item) => item.firm)
      .map((item) => item.opportunity.name),
    extras: highlightOpportunities(display)
      .filter((item) => !item.firm)
      .map((item) => item.opportunity.name),
  });
  return { display, offerMode, finalized, issues, data, email, checkoutUrl };
}

test("naive $49 matching is not used for approved optional ranges", () => {
  assert.equal(/\$49/.test("$76-$492"), true);
  assert.equal(mentionsPaidPlanPrice("$76-$492"), false);
  assert.equal(mentionsPaidPlanPrice("Get the Plan for $49."), true);
  assert.equal(mentionsPaidPlanPrice("worth $49 bucks"), true);
  assert.equal(mentionsPaidPlanPrice("I found $149 in counted savings."), false);
});

test("counted SCAN_UPSELL research produces a useful Scan, Plan, and paid draft", () => {
  const research = loadResearch("home-mountain-lesson.research.json");
  const result = renderPath(research, sparseWriting(research));
  assert.equal(result.offerMode, "SCAN_UPSELL");
  assert.equal(result.issues.length, 0);
  assert.ok(result.data.freeScan?.cta);
  assert.match(JSON.stringify(result.data.freeScan), /\$49/);
  assert.equal(freeScanLeakFlags(result.data).length, 0);
  assert.equal(initialDraftAttachmentKind("SCAN_UPSELL"), "scan");
  assert.match(result.email.body, /Get the full Savings Plan for \$49/);
  assert.ok(result.checkoutUrl && result.email.body.includes(result.checkoutUrl));
  assert.equal(assertDraftCopySafe({
    offerMode: "SCAN_UPSELL",
    body: result.email.body,
    html: result.email.html,
    checkoutUrl: result.checkoutUrl,
  }).length, 0);
});

test("no-firm-savings FULL_PLAN_FREE research does not require optional opportunity prose", () => {
  const research = loadResearch("optional-family.research.json");
  const result = renderPath(research, sparseWriting(research));
  assert.equal(result.offerMode, "FULL_PLAN_FREE");
  assert.equal(result.display.firmLow, 0);
  assert.equal(result.issues.length, 0);
  assert.equal(result.data.freeScan?.cta, undefined);
  assert.doesNotMatch(JSON.stringify(result.data.freeScan), /\$49/);
  assert.ok(result.data.opportunities.every((item) => item.found && item.saveNote && item.action));
  assert.equal(initialDraftAttachmentKind("FULL_PLAN_FREE"), "plan");
  assert.doesNotMatch(result.email.body, /\$49|stripe|checkout/i);
  assert.equal(assertDraftCopySafe({
    offerMode: "FULL_PLAN_FREE",
    body: result.email.body,
    html: result.email.html,
  }).length, 0);
});

test("optional savings that contain $492 do not look like $49 Plan language", () => {
  const research = loadResearch("conditional-range-492.research.json");
  const display = summarizeDisplaySavings(research);
  assert.equal(display.offer.offerMode, "FULL_PLAN_FREE");
  assert.equal(display.firmLow, 0);
  assert.equal(display.conditionalSavings, "$76-$492");
  const result = renderPath(research, sparseWriting(research));
  assert.equal(result.issues.length, 0);
  assert.match(result.finalized.scan.savingsLine, /\$76-\$492/);
  assert.equal(mentionsPaidPlanPrice(JSON.stringify(result.finalized.scan)), false);
  assert.doesNotMatch(JSON.stringify(result.data.freeScan), /Get the full Savings Plan|\$49(?:\.00)?(?!\d)/);
  const watch = result.data.opportunities.find((item) => item.id === "ridge-hollow-school-pass-watch");
  assert.ok(watch?.saveNote);
  assert.match(watch?.saveNote ?? "", /expired|current-price confirmation/i);
  assert.equal(assertDraftCopySafe({
    offerMode: "FULL_PLAN_FREE",
    body: `There's roughly ${display.conditionalSavings} worth a look if a couple things still go your way.`,
    html: "",
  }).length, 0);
});

test("unknown purchase status and unnamed employer stay unresolved", () => {
  const research = loadResearch("unknown-pass-employer.research.json");
  const result = renderPath(research, sparseWriting(research));
  assert.equal(result.offerMode, "FULL_PLAN_FREE");
  assert.equal(result.display.firmLow, 0);
  assert.equal(result.issues.length, 0);
  const badge = result.data.opportunities.find((item) => item.id === "north-notch-corporate-badge");
  assert.ok(badge);
  assert.match(`${badge?.saveNote} ${badge?.catchNote}`, /unknown|uncounted|not counted|employer/i);
  assert.doesNotMatch(JSON.stringify(result.data.freeScan), /\$890|\$1,177|October 31/);
  assert.equal(freeScanLeakFlags(result.data).length, 0);
});

test("multi-mountain destination family keeps product amounts in the Plan", () => {
  const research = loadResearch("destination-family.research.json");
  const leaked = sparseWriting(research);
  leaked.scan.findings[0] = {
    heading: "Steamboat 4-Day Ticket Pack",
    explanation: "Buy the $180 pack before the trip.",
  };
  const result = renderPath(research, leaked);
  assert.equal(result.offerMode, "SCAN_UPSELL");
  assert.equal(result.issues.length, 0);
  assert.doesNotMatch(JSON.stringify(result.finalized.scan), /\$180/);
  assert.match(JSON.stringify(result.data.opportunities), /\$180/);
  assert.match(result.finalized.scan.savingsLine, /\$280-\$350/);
});

test("invalid Scan prose does not discard valid Plan writing", () => {
  const research = loadResearch("home-mountain-lesson.research.json");
  const writing = sparseWriting(research);
  writing.plan.opportunities = [
    {
      id: research.opportunities[0]!.id,
      found: "The counted option is the current-season lesson window.",
      saveNote: "The counted range is the lesson save, not the optional extra-resort amount.",
      action: research.opportunities[0]!.recommendedAction,
      catchNote: "Shared format needs compatible ability.",
      timingNote: research.opportunities[0]!.deadline,
      scenarioNotes: [],
    },
  ];
  writing.scan.findings[0]!.explanation = "Buy the $180 add-on before September 21 using https://example.com/secret.";
  const result = renderPath(research, writing, "SCAN_UPSELL");
  assert.equal(result.issues.length, 0);
  assert.doesNotMatch(JSON.stringify(result.finalized.scan), /\$180|September 21|example\.com/);
  assert.equal(result.finalized.plan.opportunities[0]?.id, research.opportunities[0]!.id);
  assert.match(result.finalized.plan.opportunities[0]?.saveNote ?? "", /lesson save/i);
});

test("quality and schema failures are classified as non-retryable", () => {
  assert.equal(
    isNonRetryableWritingMessage(
      "Schema field at `properties/scanContract` uses `.optional()` without `.nullable()` which is not supported by the API.",
    ),
    true,
  );
  assert.equal(
    isNonRetryableWritingMessage("Editorial writing failed quality checks: FULL_PLAN_FREE Scan copy includes $49 language"),
    true,
  );
  assert.equal(isNonRetryableWritingMessage("Editorial OpenAI call timed out after 120000ms"), false);
});

test("cron recovery does not re-call editorial writing for WRITING_FAILED reports", () => {
  assert.ok(RECOVERABLE_RESEARCH_STATUSES.includes("WRITING_FAILED"));
  assert.equal(CRON_RECOVERABLE_RESEARCH_STATUSES.includes("WRITING_FAILED"), false);
});
