import assert from "node:assert/strict";
import { test } from "node:test";
import { isPlanDetailTeaser, writingVoiceIssues } from "../lib/copy/banned.ts";
import { adaptWritingForOfferMode, reuseSavedWriting } from "../lib/copy/editorial.ts";
import { displayCostPair, formatCustomerRange } from "../lib/research/money.ts";
import { parseReportWriting } from "../lib/copy/writing-schema.ts";
import { parseResearch } from "../lib/research/schema.ts";
import fs from "node:fs";
import path from "node:path";

test("flags consultant and research-audit phrases", () => {
  const issues = writingVoiceIssues(
    "The family explicitly identified affordability as a constraint. I checked the page on September 7 and it matched the saved research.",
  );
  assert.ok(issues.length >= 2);
});

test("allows normal second-person copy", () => {
  assert.deepEqual(
    writingVoiceIssues("You mentioned that keeping skiing affordable is important. I'd look at Cochran's first."),
    [],
  );
  assert.deepEqual(
    writingVoiceIssues("Compare the family options during the fall sale."),
    [],
  );
});

test("flags Scan teaser language used on a free Plan", () => {
  assert.equal(isPlanDetailTeaser("I'll keep the exact details in the full Plan."), true);
  assert.equal(isPlanDetailTeaser("There's a useful option tied to Winter Park."), false);
});

test("displayed subtraction matches floored savings", () => {
  const pair = displayCostPair(312.7, 106);
  assert.equal(pair.savings, "$206");
  assert.equal(pair.baseline, "$312");
  assert.equal(pair.optimized, "$106");
  assert.equal(formatCustomerRange(206.7, 312.7), "$206-$312");
});

test("saved SCAN writing can be reused for FULL_PLAN_FREE after teaser sentences are dropped", () => {
  const research = parseResearch(
    JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "tests/fixtures/destination-family.research.json"), "utf8"),
    ),
  );
  const stored = parseReportWriting({
    scan: {
      greeting: "Howdy Maya!",
      opening: "Thanks for letting me look at your winter. Winter Park as home with a 12-year-old is a pretty clear setup.",
      savingsLine: "I found roughly $280-$350 in counted savings.",
      findings: [
        {
          heading: "Something worth a look at Winter Park",
          explanation:
            "Your 12-year-old is still in a useful window at the home mountain. I'll keep the exact details in the full Plan.",
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
          scenarioNotes: [],
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

  assert.equal(reuseSavedWriting({ stored, research, offerMode: "SCAN_UPSELL" }) != null, true);
  const adapted = adaptWritingForOfferMode(stored, "FULL_PLAN_FREE");
  assert.equal(/keep the exact details/i.test(adapted.scan.findings[0]!.explanation), false);
  const reused = reuseSavedWriting({ stored, research, offerMode: "FULL_PLAN_FREE" });
  assert.ok(reused);
  assert.match(reused.scan.closing ?? "", /Hope this helps/);
});
