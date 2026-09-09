import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { writingVoiceIssues } from "../lib/copy/banned.ts";
import {
  EditorialNonRetryableError,
  editorialQualityIssues,
  finalizeEditorialWriting,
  isNonRetryableWritingError,
  reuseSavedWriting,
} from "../lib/copy/editorial.ts";
import { buildScanFindingSeed } from "../lib/copy/scan-findings.ts";
import { parseReportWriting } from "../lib/copy/writing-schema.ts";
import { summarizeDisplaySavings } from "../lib/research/display-savings.ts";
import { parseResearch, type CanonicalResearch, type ResearchOpportunity } from "../lib/research/schema.ts";

const root = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function affiliationResearch(): CanonicalResearch {
  const base = parseResearch(
    JSON.parse(fs.readFileSync(path.join(root, "tests/fixtures/optional-family.research.json"), "utf8")),
  );
  const military: ResearchOpportunity = {
    id: "home-military-season-pass-2627",
    name: "Veteran and dependent season-pass discount",
    category: "Home-mountain season passes",
    tier: "JACKPOT",
    familyMembersAffected: ["Veteran adult"],
    eligibility: "Veterans and their dependents qualify. Dependent eligibility is unknown.",
    familyFit: "A veteran was mentioned, but who qualifies is still unknown.",
    baselineCost: 1502,
    opportunityCost: 1126,
    netSavingsLow: 376,
    netSavingsHigh: 778,
    calculation: "Uncounted until dependents are confirmed.",
    deadline: null,
    restrictions: null,
    blackoutDates: null,
    stackability: "Do not add this to overlapping pass alternatives.",
    alreadyKnownByFamily: false,
    verificationStatus: "HIGH_CONFIDENCE",
    countedInHeadline: false,
    countReason: "Dependent eligibility is unknown.",
    sourceUrl: "https://example.com/military",
    sourceTitle: "Military pass page",
    sourceCheckedAt: "2026-09-09",
    notes: "The exact military-dependent relationships were not provided.",
    location: "Bolton Valley",
    whyItMatters: "A military pass price may exist, but it is not counted yet.",
    howItWorks: "A qualifying veteran and listed dependents pay a reduced season-pass price.",
    recommendedAction: "Confirm who the veteran is and which kids or adults are dependents.",
  };
  return {
    ...base,
    opportunities: [military, ...base.opportunities],
  };
}

function validWriting(research: CanonicalResearch) {
  return parseReportWriting({
    scan: {
      greeting: `Howdy ${research.family.firstName}!`,
      opening: "Thanks for letting me look at your season and the choices still in front of you.",
      savingsLine: "Nothing is firm yet.",
      findings: [
        {
          heading: "Confirm the military pass price before counting it",
          explanation: "There's a possible veteran or military pass price, but I don't yet know who qualifies.",
        },
      ],
      myTake: "I would confirm who qualifies before changing the pass setup.",
      questions: ["Who is the veteran, and which kids or adults are dependents?"],
      closing: "Hope this helps.",
    },
    plan: {
      opening: "Here is where I would start with the season you described.",
      startHereIntro: null,
      startHere: [],
      myTake: "Confirm who qualifies before counting a military pass price.",
      bottomLine: "Nothing is counted until the open questions are answered.",
      thankYou: "Reply if you want me to check another option.",
      knownSavings: [],
      opportunities: [
        {
          id: "home-military-season-pass-2627",
          found: "A veteran or military pass price may apply, but I do not yet know who qualifies.",
          saveNote: "The possible range remains uncounted until dependents are confirmed.",
          action: "Confirm who the veteran is and which kids or adults are treated as dependents.",
          catchNote: "Dependent eligibility is still unknown.",
          timingNote: null,
          scenarioNotes: [],
        },
      ],
      watchIntro: null,
      watch: [],
    },
    email: {
      observation: "The military pass price is the biggest open question.",
      opening: "Thanks for sending this over. I found a few useful checks.",
    },
  });
}

test("the production affiliation Scan seed no longer fails the family quality gate", () => {
  const research = affiliationResearch();
  const display = summarizeDisplaySavings(research);
  const military = display.opportunities.find((item) => item.opportunity.id === "home-military-season-pass-2627");
  assert.ok(military);
  const seed = buildScanFindingSeed(military, research);
  assert.equal(seed.opportunityType, "affiliation pass");
  assert.deepEqual(writingVoiceIssues(seed.whyItMatters), []);
  assert.doesNotMatch(seed.whyItMatters, /\bthe family\b/i);

  const finalized = finalizeEditorialWriting(validWriting(research), research, "FULL_PLAN_FREE");
  assert.deepEqual(
    editorialQualityIssues({ writing: finalized, research, offerMode: "FULL_PLAN_FREE" }),
    [],
  );
  assert.match(JSON.stringify(finalized.scan), /military|veteran/i);
  assert.doesNotMatch(JSON.stringify(finalized.scan), /\$49/);
  assert.ok(reuseSavedWriting({ stored: validWriting(research), research, offerMode: "FULL_PLAN_FREE" }));
});

test("saved writing with an unsupported eligibility claim fails without being treated as missing", () => {
  const research = affiliationResearch();
  const stored = validWriting(research);
  stored.plan.opportunities[0]!.found = "The family qualifies for the military discount.";
  assert.throws(
    () => reuseSavedWriting({ stored, research, offerMode: "FULL_PLAN_FREE" }),
    (error: unknown) => {
      assert.equal(error instanceof EditorialNonRetryableError, true);
      assert.equal(isNonRetryableWritingError(error), true);
      assert.match(error instanceof Error ? error.message : String(error), /the family/);
      return true;
    },
  );
});

test("a QA failure on saved writing is recoverable and does not start a new research or editorial run", () => {
  const complete = read("lib/pipeline/complete.ts");
  const ensure = complete.split("export async function ensureCurrentWriting")[1]?.split(
    "export async function generateAndUploadPdfs",
  )[0];
  assert.ok(ensure);
  assert.ok(ensure.indexOf("reuseSavedWriting") < ensure.indexOf("writeReportCopy"));
  assert.ok(ensure.indexOf("isNonRetryableWritingError") < ensure.indexOf("writeReportCopy"));
  assert.match(ensure, /WRITING_FAILED/);
  assert.doesNotMatch(ensure, /status: "WRITING" \? "WRITING"/);
  assert.doesNotMatch(ensure, /persist\(writing, "generated", "WRITING"\)/);
  assert.doesNotMatch(complete, /startBackgroundResearch|openai\.responses\.create/);

  const pdfsFn = complete.split("export async function generateAndUploadPdfs")[1]?.split(
    "export async function createInitialGmailDraft",
  )[0];
  assert.ok(pdfsFn);
  assert.ok(pdfsFn.indexOf("ensureCurrentWriting") < pdfsFn.indexOf("PDF_FAILED"));
  assert.ok(pdfsFn.indexOf("ensureCurrentWriting") < pdfsFn.indexOf("generateReportPdfBuffer"));

  const recover = read("lib/pipeline/recover.ts");
  assert.doesNotMatch(recover, /startBackgroundResearch/);
  assert.match(recover, /alreadyStored/);
  assert.match(recover, /generateAndUploadPdfs/);
  assert.match(recover, /createInitialGmailDraft/);
});

test("FULL_PLAN_FREE regeneration keeps the free Plan and never sends customer email", () => {
  const complete = read("lib/pipeline/complete.ts");
  assert.match(complete, /FREE_PLAN_READY/);
  assert.match(complete, /upsertGmailDraft/);
  assert.doesNotMatch(complete, /sendGmailMessage/);
  const emails = read("lib/copy/emails.ts");
  assert.match(emails, /FULL_PLAN_FREE email includes upsell language/);
});
