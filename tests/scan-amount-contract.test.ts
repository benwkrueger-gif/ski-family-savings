import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { buildInitialDraftEmail } from "../lib/copy/emails.ts";
import {
  editorialQualityIssues,
  finalizeEditorialWriting,
  repairEditorialWriting,
  scanDollarIssues,
} from "../lib/copy/editorial.ts";
import { parseReportWriting } from "../lib/copy/writing-schema.ts";
import { approvedHeadlineSavingsLine } from "../lib/copy/scan-amounts.ts";
import { buildSavingsPlanCheckoutUrl } from "../lib/stripe/checkout.ts";
import { summarizeDisplaySavings } from "../lib/research/display-savings.ts";
import { parseResearch } from "../lib/research/schema.ts";
import { freeScanLeakFlags, researchToReportData } from "../lib/research/to-report.ts";

const lessonResearch = parseResearch(
  JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "tests/fixtures/home-mountain-lesson.research.json"), "utf8"),
  ),
);
const optionalResearch = parseResearch(
  JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "tests/fixtures/optional-family.research.json"), "utf8"),
  ),
);
const destinationResearch = parseResearch(
  JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "tests/fixtures/destination-family.research.json"), "utf8"),
  ),
);

const REPORT_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function validPlan(research = lessonResearch) {
  const first = research.family.firstName;
  return {
    opening: `Here is where I would start with the season you described, ${first}.`,
    startHereIntro: null,
    startHere: research.paidPlan.startHere.map((step) => ({
      number: step.number,
      title: step.title,
      description: step.description,
    })),
    myTake: "Start with the counted option, then decide what else is actually on the calendar.",
    bottomLine: "Do not add optional scenarios onto the counted number.",
    thankYou: "Reply if you want me to check another option.",
    knownSavings: [],
    opportunities: [
      {
        id: research.opportunities[0]!.id,
        found: "The counted option is the current-season lesson window.",
        saveNote: "The counted range is the lesson save, not the optional extra-resort amount.",
        action: research.opportunities[0]!.recommendedAction,
        catchNote: "Shared format needs compatible ability.",
        timingNote: research.opportunities[0]!.deadline,
        scenarioNotes: [],
      },
    ],
    watchIntro: null,
    watch: [],
  };
}

function leakedScanWriting() {
  return parseReportWriting({
    scan: {
      greeting: "Howdy Casey!",
      opening: "Thanks for letting me look at your winter around Home Notch and North Peak.",
      savingsLine: "I found $180 on the Indy add-on plus the lesson.",
      findings: [
        {
          heading: "Indy Base Add-On at North Peak",
          explanation: "Buy the $180 Indy add-on before you spend more on extra-resort days.",
        },
      ],
      myTake: "I would grab the $180 pass deal and then look at the lesson.",
      questions: ["Do you already own the Indy pass?"],
      closing: null,
    },
    plan: {
      ...validPlan(),
      opportunities: [
        {
          id: "indy-home-addon-2026-27",
          found: "The extra-resort add-on only helps if you were already going to buy it.",
          saveNote: "That $180 is an optional scenario, not counted savings.",
          action: "Only buy this if the extra resorts are actually on the calendar.",
          catchNote: "Do not add this to the lesson number.",
          timingNote: null,
          scenarioNotes: [],
        },
      ],
    },
    email: {
      observation: "The weekday lesson is the clear first step.",
      opening: "Thanks for sending this over. I found one useful first step.",
    },
  });
}

test("approved headline estimate is allowed and $180 product amount is blocked", () => {
  const display = summarizeDisplaySavings(lessonResearch);
  assert.equal(display.headlineSavings, "$149-$214");
  assert.equal(display.conditionalSavings, "$286");
  assert.equal(display.offer.offerMode, "SCAN_UPSELL");
  assert.deepEqual(
    scanDollarIssues({
      scanText: `I found roughly ${display.headlineSavings} in counted savings.`,
      approvedSavings: [display.headlineSavings],
    }),
    [],
  );
  assert.deepEqual(
    scanDollarIssues({
      scanText: "The add-on saves $180 if you were already buying it.",
      approvedSavings: [display.headlineSavings],
    }),
    ["Scan copy includes unapproved paid-detail amount $180"],
  );
});

test("model-written free-Scan prose cannot introduce additional numeric savings", () => {
  const leaked = leakedScanWriting();
  const rawIssues = editorialQualityIssues({
    writing: leaked,
    research: lessonResearch,
    offerMode: "SCAN_UPSELL",
  });
  assert.ok(rawIssues.some((issue) => /unapproved paid-detail amount \$180/i.test(issue)));

  const writing = finalizeEditorialWriting(leaked, lessonResearch, "SCAN_UPSELL");
  const scan = JSON.stringify(writing.scan);
  assert.doesNotMatch(scan, /\$180|Indy/);
  assert.match(writing.scan.savingsLine, /\$149-\$214/);
  assert.equal(writing.scan.savingsLine, approvedHeadlineSavingsLine(summarizeDisplaySavings(lessonResearch)));
});

test("valid Plan writing is preserved when only Scan writing fails", () => {
  const leaked = leakedScanWriting();
  const writing = finalizeEditorialWriting(leaked, lessonResearch, "SCAN_UPSELL");
  const addon = writing.plan.opportunities.find((item) => item.id === "indy-home-addon-2026-27");
  assert.ok(addon);
  assert.match(addon?.saveNote ?? "", /\$180/);
  assert.match(addon?.found ?? "", /extra-resort add-on/i);
});

test("optional and unknown items render without invented Scan prose", () => {
  const writing = finalizeEditorialWriting(leakedScanWriting(), lessonResearch, "SCAN_UPSELL");
  const data = researchToReportData({
    research: lessonResearch,
    reportId: REPORT_ID,
    offerMode: "SCAN_UPSELL",
    writing,
  });
  const camp = data.opportunities.find((item) => item.id === "home-notch-camp-discount-2026-27");
  assert.ok(camp?.found);
  assert.match(camp?.saveNote ?? "", /uncounted|not counted/i);
  assert.doesNotMatch(JSON.stringify(data.freeScan), /Something worth a look|camp discount|\$132/);
});

test("FULL_PLAN_FREE still renders its deterministic summary", () => {
  const modelWriting = parseReportWriting({
    scan: {
      greeting: "Howdy Riley!",
      opening: "Thanks for letting me look at your season and the choices still in front of you.",
      savingsLine: "Buy the $99 lease before October 10, 2026.",
      findings: [
        {
          heading: "A few choices to confirm",
          explanation: "Buy the $99 lease before October 10, 2026 using https://example.com/secret.",
        },
      ],
      myTake: "I would settle the pass question first, then decide what equipment is actually needed.",
      questions: [],
      closing: "The exact details are in the Plan.",
    },
    plan: {
      opening: "Here is where I would start with the season you described.",
      startHereIntro: null,
      startHere: [],
      myTake: "Confirm what is already owned before spending money on another option.",
      bottomLine: "Nothing is counted until the open questions are answered.",
      thankYou: "Reply if you want me to check another option.",
      knownSavings: [],
      opportunities: [],
      watchIntro: null,
      watch: [],
    },
    email: {
      observation: "The equipment choice is the biggest open question.",
      opening: "Thanks for sending this over. I found a few useful checks.",
    },
  });
  const writing = finalizeEditorialWriting(modelWriting, optionalResearch, "FULL_PLAN_FREE");
  const data = researchToReportData({
    research: optionalResearch,
    reportId: "optional-family",
    offerMode: "FULL_PLAN_FREE",
    writing,
  });
  const scan = JSON.stringify(data.freeScan);
  assert.doesNotMatch(scan, /\$99|October 10|example\.com\/secret|\$49/);
  assert.equal(freeScanLeakFlags(data).length, 0);
});

test("SCAN_UPSELL keeps strict paid-content protection after repair", () => {
  const writing = finalizeEditorialWriting(leakedScanWriting(), lessonResearch, "SCAN_UPSELL");
  const data = researchToReportData({
    research: lessonResearch,
    reportId: REPORT_ID,
    offerMode: "SCAN_UPSELL",
    checkoutUrl: buildSavingsPlanCheckoutUrl({
      paymentLink: "https://buy.stripe.com/test_abc",
      internalId: REPORT_ID,
      email: "casey@example.com",
    }),
    writing,
  });
  const scan = JSON.stringify({
    ...data.freeScan,
    cta: data.freeScan?.cta ? { ...data.freeScan.cta, url: undefined } : undefined,
  });
  assert.doesNotMatch(scan, /September 21|promo|Half-Price|Indy|\$180|\$149\.50/);
  assert.match(scan, /\$149-\$214/);
  assert.match(JSON.stringify(data.freeScan), /\$49/);
  assert.equal(freeScanLeakFlags(data).length, 0);
});

test("Scan repair does not require another full editorial rewrite", () => {
  const leaked = leakedScanWriting();
  const first = finalizeEditorialWriting(leaked, lessonResearch, "SCAN_UPSELL");
  const second = finalizeEditorialWriting(first, lessonResearch, "SCAN_UPSELL");
  assert.equal(second.plan.opportunities[0]?.saveNote, first.plan.opportunities[0]?.saveNote);
  assert.equal(second.scan.savingsLine, first.scan.savingsLine);
});

test("unsupported firm savings cannot be made valid by changing wording", () => {
  const display = summarizeDisplaySavings(optionalResearch);
  assert.equal(display.firmLow, 0);
  assert.equal(display.offer.offerMode, "FULL_PLAN_FREE");
  const wording = repairEditorialWriting(
    parseReportWriting({
      scan: {
        greeting: "Howdy Riley!",
        opening: "Thanks for letting me look at your season and the choices still in front of you.",
        savingsLine: "I found $600 in firm counted savings.",
        findings: [
          {
            heading: "A few choices to confirm",
            explanation: "This is definitely $600 in the bank already.",
          },
        ],
        myTake: "I would treat this as money already saved.",
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
        opportunities: [],
        watchIntro: null,
        watch: [],
      },
      email: {
        observation: "The equipment choice is the biggest open question.",
        opening: "Thanks for sending this over. I found a few useful checks.",
      },
    }),
    optionalResearch,
    "FULL_PLAN_FREE",
  );
  const after = summarizeDisplaySavings(optionalResearch);
  assert.equal(after.offer.offerMode, "FULL_PLAN_FREE");
  assert.equal(after.firmLow, 0);
  assert.doesNotMatch(wording.scan.savingsLine, /\$600 in firm counted/);
});

test("customer-specific checkout URLs keep the report reference", () => {
  const checkoutUrl = buildSavingsPlanCheckoutUrl({
    paymentLink: "https://buy.stripe.com/test_abc",
    internalId: REPORT_ID,
    email: "casey@example.com",
  });
  const email = buildInitialDraftEmail({
    firstName: "Casey",
    offerMode: "SCAN_UPSELL",
    savingsRange: summarizeDisplaySavings(lessonResearch).headlineSavings,
    checkoutUrl,
    coreSavingsLow: 149.5,
    mountains: ["Home Notch", "North Peak"],
    findings: ["A kids lesson window at North Peak"],
  });
  assert.match(email.body, /client_reference_id=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee/);
  assert.match(email.body, /locked_prefilled_email=casey%40example.com/);
  assert.doesNotMatch(email.body, /https:\/\/buy\.stripe\.com\/test_abc(?:\s|$)/);
  assert.match(email.html, /client_reference_id=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee/);
  assert.match(email.html, /Get the full Savings Plan for \$49/);
});

test("destination-family $180 stays in the Plan only", () => {
  const writing = parseReportWriting({
    scan: {
      greeting: "Howdy Maya!",
      opening: "Thanks for letting me look at your winter. Winter Park as home with a 12-year-old is a pretty clear setup.",
      savingsLine: "The add-on is $180 if you go to Steamboat.",
      findings: [
        {
          heading: "Steamboat 4-Day Ticket Pack",
          explanation: "Buy the $180 Steamboat pack before the trip.",
        },
      ],
      myTake: "I would spend the $180 only if Steamboat is on.",
      questions: [],
      closing: null,
    },
    plan: {
      opening: "Howdy Maya. Here is where I would start with the season you described.",
      startHereIntro: null,
      startHere: destinationResearch.paidPlan.startHere.map((step) => ({
        number: step.number,
        title: step.title,
        description: step.description,
      })),
      myTake: "Settle Winter Park first, then decide if Steamboat is actually happening.",
      bottomLine: "Do not add the optional weekend to the counted number.",
      thankYou: "Reply if the weekend firms up.",
      knownSavings: [],
      opportunities: [
        {
          id: "steamboat-optional-days-2627",
          found: "The extra mountain is only if you actually go.",
          saveNote: "That $180 is optional and not added to the Winter Park number.",
          action: "If the weekend is on, buy the 4-day pack before you go.",
          catchNote: null,
          timingNote: null,
          scenarioNotes: [],
        },
      ],
      watchIntro: null,
      watch: [],
    },
    email: {
      observation: "Winter Park is the clear first step.",
      opening: "Thanks for sending this over. I found one useful first step.",
    },
  });
  const finalized = finalizeEditorialWriting(writing, destinationResearch, "SCAN_UPSELL");
  assert.doesNotMatch(JSON.stringify(finalized.scan), /\$180/);
  assert.match(finalized.plan.opportunities[0]?.saveNote ?? "", /\$180/);
  assert.match(finalized.scan.savingsLine, /\$280-\$350/);
});
