import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";
import { test } from "node:test";
import {
  buildEditorialFactPacket,
  finalizeEditorialWriting,
  repairEditorialWriting,
  reuseSavedWriting,
  scanPaidContentIssues,
} from "../lib/copy/editorial.ts";
import { SCAN_WRITING_CONTRACT } from "../lib/copy/scan-contract.ts";
import { parseReportWriting } from "../lib/copy/writing-schema.ts";
import { buildScanCopy } from "../lib/copy/reports.ts";
import { blandScanIssues } from "../lib/copy/scan-findings.ts";
import { summarizeDisplaySavings } from "../lib/research/display-savings.ts";
import { parseResearch } from "../lib/research/schema.ts";
import { freeScanLeakFlags, researchToReportData } from "../lib/research/to-report.ts";

function load(name: string) {
  return parseResearch(
    JSON.parse(fs.readFileSync(path.join(process.cwd(), "tests/fixtures", name), "utf8")),
  );
}

const lessonResearch = load("home-mountain-lesson.research.json");
const optionalResearch = load("optional-family.research.json");
const destinationResearch = load("destination-family.research.json");

function validPlan(research: ReturnType<typeof parseResearch>) {
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
    opportunities: research.opportunities.slice(0, 1).map((item) => ({
      id: item.id,
      found: "This is the current-season option I would look at first.",
      saveNote: "Keep optional amounts separate from the counted number.",
      action: item.recommendedAction,
      catchNote: null,
      timingNote: item.deadline,
      scenarioNotes: [],
    })),
    watchIntro: null,
    watch: [],
  };
}

function blandWriting(research: ReturnType<typeof parseResearch>) {
  return parseReportWriting({
    scan: {
      greeting: `Howdy ${research.family.firstName}!`,
      opening: "Thanks for letting me look at your winter. I found a couple things worth checking for the season.",
      savingsLine: "I found roughly $0 that looks worth a look.",
      findings: [
        {
          heading: "Something worth a look",
          explanation: "There's a useful option here. I'll keep the exact details in the full Plan.",
        },
      ],
      myTake: "If I were in your shoes, I'd start with the home-mountain question, then decide whether the extra mountain is actually on the calendar.",
      questions: [],
      closing: null,
    },
    plan: validPlan(research),
    email: {
      observation: "I found a useful first step.",
      opening: "Thanks for sending this over. I found one useful first step.",
    },
  });
}

function assertUsefulScan(
  label: string,
  research: ReturnType<typeof parseResearch>,
  offerMode: "SCAN_UPSELL" | "FULL_PLAN_FREE",
) {
  const writing = finalizeEditorialWriting(blandWriting(research), research, offerMode);
  const data = researchToReportData({
    research,
    reportId: `${label}-scan`,
    offerMode,
    checkoutUrl: offerMode === "SCAN_UPSELL" ? "https://buy.stripe.com/test_abc" : null,
    writing,
  });
  const scan = data.freeScan;
  assert.ok(scan);
  const prose = [
    scan.opening,
    scan.myTake,
    ...(scan.findings ?? []).flatMap((finding) => [finding.heading, finding.explanation]),
  ].join("\n");

  assert.equal(blandScanIssues(prose).length, 0, `${label}: bland leftover`);
  assert.doesNotMatch(prose, /I'll keep the exact details|Something worth a look|couple things worth checking/i);
  assert.match(scan.myTake ?? "", /I wouldn'?t|I'd start|If I were in your shoes/i);
  assert.ok(
    (scan.findings ?? []).some((finding) => /I'd |I wouldn'?t |Skip |Confirm |look at/i.test(finding.explanation)),
    `${label}: missing a usable recommendation`,
  );
  assert.equal(freeScanLeakFlags(data).length, 0, `${label}: leak flags ${freeScanLeakFlags(data).join("; ")}`);
  for (const opportunity of research.opportunities) {
    assert.equal(prose.includes(opportunity.name), false, `${label} leaked ${opportunity.name}`);
  }
  assert.doesNotMatch(prose, /\$\d|https?:\/\/|promo code|SRS-/i);

  if (offerMode === "SCAN_UPSELL") {
    assert.match(String(scan.cta?.body), /doing the digging yourself/);
    assert.match(String(scan.cta?.body), /I'll refund you/);
    assert.doesNotMatch(prose, /doing the digging yourself/);
  } else {
    assert.equal(scan.cta, undefined);
  }

  assert.equal(writing.plan.opportunities[0]?.id, research.opportunities[0]?.id);
}

test("Casey Scan is personal, useful, and keeps paid details in the Plan", () => {
  assertUsefulScan("casey", lessonResearch, "SCAN_UPSELL");
  const scan = JSON.stringify(
    buildScanCopy({ research: lessonResearch, offerMode: "SCAN_UPSELL" }),
  );
  assert.match(scan, /8-year-old and a 5-year-old/);
  assert.match(scan, /North Peak/);
  assert.match(scan, /Home Notch/);
  assert.match(scan, /counted/);
  assert.match(scan, /optional|only if/i);
  assert.match(scan, /share a lesson/i);
  assert.doesNotMatch(scan, /Half-Price|September 21|\$180|Indy Base/i);
});

test("Riley Scan stays honest when nothing is counted yet", () => {
  assertUsefulScan("riley", optionalResearch, "FULL_PLAN_FREE");
  const scan = JSON.stringify(
    buildScanCopy({ research: optionalResearch, offerMode: "FULL_PLAN_FREE" }),
  );
  assert.match(scan, /4-year-old/);
  assert.match(scan, /North Ridge|gear|pass/i);
  assert.match(scan, /not yet|wouldn't treat any of this as money in the bank/i);
  assert.doesNotMatch(scan, /\$49|I'll keep the exact details/);
});

test("Maya Scan starts at Winter Park and keeps Steamboat optional", () => {
  assertUsefulScan("maya", destinationResearch, "SCAN_UPSELL");
  const scan = JSON.stringify(
    buildScanCopy({ research: destinationResearch, offerMode: "SCAN_UPSELL" }),
  );
  assert.match(scan, /12-year-old/);
  assert.match(scan, /Winter Park/);
  assert.match(scan, /Steamboat/);
  assert.doesNotMatch(scan, /Youth Season Pass|4-Day Ticket Pack|October 12|\$180/);
});

test("Scan fact packet seeds omit paid execution details", () => {
  const display = summarizeDisplaySavings(lessonResearch);
  const packet = buildEditorialFactPacket({
    research: lessonResearch,
    display,
    offerMode: "SCAN_UPSELL",
  });
  const seeds = JSON.stringify(packet.scanFindingSeeds);
  assert.match(seeds, /weekday private lesson|extra-resort pass|off-slope/i);
  assert.doesNotMatch(seeds, /\$\d|https?:\/\/|SRS-|September 21|Half-Price/i);
  assert.equal((packet.scanFindingSeeds as unknown[]).length > 0, true);
});

test("unversioned saved writing refreshes Scan and keeps Plan copy", () => {
  const writing = blandWriting(lessonResearch);
  writing.plan.myTake = "Keep this Plan take exactly as written.";
  writing.scan.findings = [
    {
      heading: "A lesson discount at North Peak",
      explanation:
        "This looks like a cheaper way to get the kids on snow if it fits the days you already have on the calendar.",
    },
  ];
  writing.scan.opening = "Thanks for letting me look at your winter. Here's the first thing I noticed for this season.";
  writing.scan.myTake = "Start with the home mountain, then decide on extras this season.";
  const reused = reuseSavedWriting({
    stored: writing,
    research: lessonResearch,
    offerMode: "SCAN_UPSELL",
  });
  assert.ok(reused);
  assert.equal(reused.scanContract, SCAN_WRITING_CONTRACT);
  assert.equal(reused.plan.myTake, "Keep this Plan take exactly as written.");
  assert.match(reused.scan.opening, /8-year-old and a 5-year-old/);
  assert.match(reused.scan.findings[0]?.heading ?? "", /weekday private lesson at North Peak/);
  assert.doesNotMatch(reused.scan.opening, /first thing I noticed/);
  assert.doesNotMatch(reused.scan.myTake, /Start with the home mountain, then decide on extras this season/);
});

test("versioned Scan copy is kept when it already uses the current contract", () => {
  const base = reuseSavedWriting({
    stored: blandWriting(lessonResearch),
    research: lessonResearch,
    offerMode: "SCAN_UPSELL",
  });
  assert.ok(base);
  const stored = parseReportWriting({
    ...base,
    scan: {
      ...base.scan,
      opening:
        "Thanks for letting me look at this. You've got an 8-year-old and a 5-year-old, and a season around Home Notch.",
    },
  });
  const reused = reuseSavedWriting({
    stored,
    research: lessonResearch,
    offerMode: "SCAN_UPSELL",
  });
  assert.ok(reused);
  assert.equal(
    reused.scan.opening,
    "Thanks for letting me look at this. You've got an 8-year-old and a 5-year-old, and a season around Home Notch.",
  );
  assert.equal(reused.plan.myTake, stored.plan.myTake);
});

test("Scan repair replaces heading and explanation together when either is bland", () => {
  const writing = blandWriting(lessonResearch);
  writing.scan.findings = [
    {
      heading: "A kids lesson window at North Peak",
      explanation:
        "A weekday private lesson at North Peak looks cheaper than the usual rate for an 8-year-old and a 5-year-old. I'd look at that lesson first. This is counted savings.",
    },
  ];
  writing.plan.myTake = "Keep this Plan take exactly as written.";
  const repaired = repairEditorialWriting(writing, lessonResearch, "SCAN_UPSELL");
  assert.equal(repaired.plan.myTake, "Keep this Plan take exactly as written.");
  assert.equal(repaired.scan.findings[0]?.heading, "Start with a weekday private lesson at North Peak");
  assert.match(repaired.scan.findings[0]?.explanation ?? "", /weekday private lesson at North Peak/);
  assert.doesNotMatch(repaired.scan.findings[0]?.heading ?? "", /kids lesson window/i);
});

test("useful Scan language is allowed and half-price mechanics are still blocked", () => {
  assert.deepEqual(
    scanPaidContentIssues(
      "A weekday lesson at North Peak may be cheaper, and the kids may fit a kids' benefit if they can share a lesson.",
      lessonResearch,
    ),
    [],
  );
  assert.ok(
    scanPaidContentIssues(
      "Jay Peak is offering a weekday private lesson at half the usual price if booked early enough.",
      lessonResearch,
    ).length > 0,
  );
});
