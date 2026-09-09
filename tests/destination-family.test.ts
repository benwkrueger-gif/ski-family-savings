import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { editorialQualityIssues } from "../lib/copy/editorial.ts";
import { parseReportWriting, type ReportWriting } from "../lib/copy/writing-schema.ts";
import { buildInitialDraftEmail } from "../lib/copy/emails.ts";
import { summarizeDisplaySavings } from "../lib/research/display-savings.ts";
import { parseResearch } from "../lib/research/schema.ts";
import { freeScanLeakFlags, researchToReportData } from "../lib/research/to-report.ts";
import { parseReport } from "../reports/schema.ts";

const fixturePath = path.join(
  process.cwd(),
  "tests/fixtures/destination-family.research.json",
);

function loadFixture() {
  return parseResearch(JSON.parse(fs.readFileSync(fixturePath, "utf8")));
}

function sampleWriting(): ReportWriting {
  return parseReportWriting({
    scan: {
      greeting: "Howdy Maya!",
      opening: "Thanks for letting me look at your winter. Winter Park as home with a 12-year-old is a pretty clear setup.",
      savingsLine: "I found roughly $280-$350 in counted savings.",
      findings: [
        {
          heading: "Something worth a look at Winter Park",
          explanation: "Your 12-year-old is still in a useful window at the home mountain. I'll keep the exact details in the full Plan.",
        },
        {
          heading: "Steamboat only if you actually go",
          explanation: "That weekend is still a maybe, so I would not build the season around it yet.",
        },
      ],
      myTake: "If I were in your shoes, I'd settle the Winter Park question first, then decide if Steamboat is actually happening.",
      questions: ["Is the Steamboat weekend actually on?"],
      closing: null,
    },
    plan: {
      opening: "Howdy Maya. Here's where I'd start with the season you described.",
      startHereIntro: "Two things, in this order.",
      startHere: [
        {
          number: 1,
          title: "Get the Winter Park youth pass",
          description: "Buy the official youth season pass for the 12-year-old before October 12, 2026.",
        },
        {
          number: 2,
          title: "Decide on Steamboat",
          description: "If that weekend is happening, buy the 4-day pack in advance. If not, skip it.",
        },
      ],
      myTake: "Do the home-mountain pass first. The extra weekend is only worth it if you actually go.",
      bottomLine: "Start with Winter Park, then decide on Steamboat.",
      thankYou: "If the Steamboat weekend firms up, just reply.",
      knownSavings: [
        {
          title: "Adult Winter Park season pass already owned",
          note: "You already have your own pass, so I left that out of the found number.",
        },
      ],
      opportunities: [
        {
          id: "winter-park-youth-pass-2627",
          found: "Your 12-year-old is still in the youth window at Winter Park, and that official pass is cheaper than adult-priced season access.",
          saveNote: "$280-$350 if you buy the Winter Park Youth Season Pass instead of adult-priced access.",
          action: "Buy the Winter Park Youth Season Pass before October 12, 2026 from the official tickets page.",
          catchNote: "Youth pass is not valid for night-only products.",
          timingNote: "October 12, 2026",
          scenarioNotes: [],
        },
        {
          id: "steamboat-optional-days-2627",
          found: "Steamboat was only listed as considering. If that weekend happens, the 4-day pack beats window tickets.",
          saveNote: "$180 only if you actually go. Do not add this to the Winter Park number.",
          action: "If the weekend is on, buy the Steamboat 4-Day Ticket Pack before you go.",
          catchNote: "Skip it if the trip is still a maybe.",
          timingNote: "Buy before the trip, not at the window.",
          scenarioNotes: [
            {
              label: "This option",
              note: "This is the considering-weekend option, not something to add on top of Winter Park.",
            },
          ],
        },
        {
          id: "winter-park-retail-watch-2627",
          found: "Passholder retail is only useful if you were already buying gear. I did not count it.",
          saveNote: "$0 counted. Up to $60 only if you actually buy eligible gear.",
          action: "Only use this if you are already shopping.",
          catchNote: "No named purchase, so this stays on Watch.",
          timingNote: null,
          scenarioNotes: [],
        },
      ],
      watchIntro: "Not counted yet.",
      watch: [
        {
          title: "Seasonal rental if the 12-year-old is still growing",
          note: "Only if they do not already own gear that fits.",
        },
      ],
    },
    email: {
      observation: "Winter Park as home with a 12-year-old made this a clear one.",
      opening: "Thanks for sending this over. I had fun looking through this one.",
    },
  });
}

test("anonymized destination fixture is SCAN_UPSELL from firm savings, not the considering trip", () => {
  const research = loadFixture();
  const summary = summarizeDisplaySavings(research);
  assert.equal(summary.offer.offerMode, "SCAN_UPSELL");
  assert.equal(summary.firmLow, 280);
  assert.equal(summary.firmHigh, 350);
  assert.notEqual(summary.firmHigh, 280 + 180);
  assert.equal(summary.counts.jackpotCount, 1);
  assert.equal(summary.counts.strongCount, 1);
  assert.equal(summary.counts.watchCount, 1);
  const steamboat = summary.opportunities.find((item) => item.opportunity.id === "steamboat-optional-days-2627");
  assert.equal(steamboat?.kind, "optional");
  assert.equal(steamboat?.firm, false);
});

test("destination fixture Scan does not leak paid details and Plan keeps them", () => {
  const research = loadFixture();
  const writing = sampleWriting();
  const data = researchToReportData({
    research,
    reportId: "11111111-1111-4111-8111-111111111111",
    offerMode: "SCAN_UPSELL",
    checkoutUrl: "https://buy.stripe.com/test_maya",
    writing,
  });
  const scanText = JSON.stringify(data.freeScan);
  assert.equal(scanText.includes("Winter Park Youth Season Pass"), false);
  assert.equal(scanText.includes("Steamboat 4-Day Ticket Pack"), false);
  assert.equal(scanText.includes("https://www.winterparkresort.com"), false);
  assert.equal(scanText.includes("October 12"), false);
  assert.match(String(data.freeScan?.cta?.body), /I'll refund you/);
  assert.equal(data.freeScan?.cta?.price, "$49");
  assert.equal(freeScanLeakFlags(data).length, 0);

  const youth = data.opportunities.find((item) => item.id === "winter-park-youth-pass-2627");
  assert.equal(youth?.title, "Winter Park Youth Season Pass");
  assert.match(String(youth?.found), /youth window/);
  assert.match(String(youth?.action), /October 12, 2026/);
  assert.equal(youth?.source?.url, "https://www.winterparkresort.com/plan-your-trip/tickets-and-passes");
  assert.doesNotMatch(JSON.stringify(data), /This research sentence should never appear/);
});

test("destination fixture email matches SCAN_UPSELL and uses the same savings range", () => {
  const research = loadFixture();
  const summary = summarizeDisplaySavings(research);
  const writing = sampleWriting();
  const email = buildInitialDraftEmail({
    firstName: research.family.firstName,
    offerMode: summary.offer.offerMode,
    savingsRange: summary.headlineSavings,
    personalizedObservation: writing.email.observation,
    emailOpening: writing.email.opening,
    checkoutUrl: "https://buy.stripe.com/test_maya",
    coreSavingsLow: summary.firmLow,
  });
  assert.match(email.body, /Maya/);
  assert.match(email.body, /\$280-\$350/);
  assert.match(email.body, /\$49/);
  assert.match(email.body, /Savings Scan/);
});

test("editorial quality rejects shortened program names in the Scan", () => {
  const research = loadFixture();
  const writing = sampleWriting();
  writing.scan.findings[0]!.heading = "Winter Park youth season pass";
  writing.scan.findings[0]!.explanation =
    "Since your 12-year-old qualifies, securing that youth season pass should be a top move.";
  const issues = editorialQualityIssues({
    writing,
    research,
    offerMode: "SCAN_UPSELL",
  });
  assert.ok(issues.some((issue) => /shortened program name/i.test(issue)));
});

test("FULL_PLAN_FREE writing is rejected if it teases Plan details", () => {
  const research = loadFixture();
  const writing = sampleWriting();
  writing.scan.findings[0]!.explanation =
    "There's a useful option at Winter Park. I'll keep the exact details in the Plan.";
  writing.scan.closing = "Hope this helps.\n\nBen";
  const issues = editorialQualityIssues({
    writing,
    research,
    offerMode: "FULL_PLAN_FREE",
  });
  assert.ok(issues.some((issue) => /teases Plan details/i.test(issue)));
});

test("approved example report parses as the visual fixture", () => {
  const data = parseReport(
    JSON.parse(fs.readFileSync(path.join(process.cwd(), "reports/examples/ben.json"), "utf8")),
  );
  assert.equal(data.family.firstName, "Ben");
  assert.ok(data.freeScan?.findings.length);
  assert.ok(data.opportunities[0]?.found);
  assert.equal(data.freeScan?.cta?.price, "$49");
  assert.match(String(data.freeScan?.cta?.body), /I'll refund you/);
});
