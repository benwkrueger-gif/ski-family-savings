import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { isTransientRateLimitError } from "../lib/openai/rate-limit.ts";
import { shouldDispatchAutoResearch } from "../lib/pipeline/ingest.ts";
import { interpretFailedResearchClaim } from "../lib/pipeline/research.ts";
import { isQueuedForAutoResearch } from "../lib/pipeline/status.ts";

const root = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("one new Tally submission dispatches one auto-research job; duplicates do not", () => {
  assert.equal(
    shouldDispatchAutoResearch({ created: true, autoResearch: true, openaiResponseId: null }),
    true,
  );
  assert.equal(
    shouldDispatchAutoResearch({ created: false, autoResearch: true, openaiResponseId: null }),
    false,
  );
  assert.equal(
    shouldDispatchAutoResearch({ created: true, autoResearch: true, openaiResponseId: "resp_1" }),
    false,
  );
  assert.equal(
    shouldDispatchAutoResearch({ created: true, autoResearch: false, openaiResponseId: null }),
    false,
  );

  const ingest = read("lib/pipeline/ingest.ts");
  assert.match(ingest, /autoResearch: false/);
  assert.match(ingest, /source: "import"/);
  assert.match(ingest, /deferSideEffects/);
  assert.doesNotMatch(ingest.split("export async function ingestTallyApiSubmission")[1] ?? "", /startResearch/);
});

test("Tally webhook acknowledges before research starts and never auto-sends results", () => {
  const route = read("app/api/webhooks/tally/route.ts");
  assert.match(route, /from "next\/server"/);
  assert.match(route, /deferSideEffects: true/);
  assert.match(route, /after\(\(\) =>/);
  assert.match(route, /runTallyWebhookSideEffects/);
  assert.ok(route.indexOf("ingestTallyWebhook") < route.indexOf("after("));
  assert.ok(route.indexOf("return Response.json") > route.indexOf("after("));

  const ingest = read("lib/pipeline/ingest.ts");
  const sideEffects = ingest.split("export async function runTallyWebhookSideEffects")[1]?.split(
    "export async function ingestTallyWebhook",
  )[0];
  assert.match(String(sideEffects), /dispatchQueuedResearch/);
  assert.match(String(sideEffects), /sendConfirmationIfNeeded/);
  assert.doesNotMatch(String(sideEffects), /sendGmailMessage|upsertGmailDraft/);

  const complete = read("lib/pipeline/complete.ts");
  assert.match(complete, /upsertGmailDraft/);
  assert.doesNotMatch(complete, /sendGmailMessage/);
});

test("research start is claimed atomically and extra jobs wait instead of racing", () => {
  const store = read("lib/pipeline/store.ts");
  const claim = store.split("export async function claimResearchStart")[1]?.split(
    "export async function resetStaleResearchStarts",
  )[0];
  assert.match(String(claim), /status: "RESEARCH_STARTING"/);
  assert.match(String(claim), /isNull\(customerReports.openaiResponseId\)/);
  assert.match(String(claim), /select count\(\*\)::int from customer_reports/);
  assert.match(String(claim), /RESEARCH_STARTING/);
  assert.match(String(claim), /RESEARCHING/);

  assert.deepEqual(interpretFailedResearchClaim({ status: "RECEIVED" }), {
    started: false,
    reason: "waiting_for_capacity",
  });
  assert.deepEqual(interpretFailedResearchClaim({ status: "RESEARCH_STARTING" }), {
    started: false,
    reason: "already_in_progress",
  });
  assert.deepEqual(interpretFailedResearchClaim({ status: "RESEARCHING" }), {
    started: false,
    reason: "already_in_progress",
  });
  assert.deepEqual(
    interpretFailedResearchClaim({ status: "RECEIVED", openaiResponseId: "resp_1" }),
    { started: false, reason: "has_existing_response" },
  );
});

test("transient TPM 429s requeue instead of failing the job; oversized requests do not", () => {
  const rateLimited = Object.assign(new Error("Rate limit reached for gpt-5.6-sol on tokens per min (TPM): Limit 500000, Used 445079, Requested 114548"), {
    status: 429,
  });
  assert.equal(isTransientRateLimitError(rateLimited), true);
  assert.equal(
    isTransientRateLimitError(new Error("Research request exceeds the TPM budget (request reserved 114548 tokens against a 50000 TPM limit)")),
    false,
  );

  const startResearch = read("lib/pipeline/research.ts");
  const catchBlock = startResearch.split("if (isTransientRateLimitError(error))")[1] ?? "";
  assert.match(catchBlock, /reason: "rate_limited"/);
  assert.match(catchBlock, /requeueForLater/);
  assert.ok(catchBlock.indexOf("rate_limited") < catchBlock.indexOf("RESEARCH_FAILED"));
});

test("missed completion webhooks and stale RESEARCH_STARTING rows are recovered without a new research run by default", () => {
  const recover = read("lib/pipeline/recover.ts");
  assert.match(recover, /resetStaleResearchStarts/);
  assert.match(recover, /startNextIfIdle/);
  assert.match(recover, /alreadyStored/);
  assert.match(recover, /needsPdfs/);
  assert.match(recover, /needsDraft/);
  assert.match(recover, /generateAndUploadPdfs/);
  assert.match(recover, /createInitialGmailDraft/);
  assert.doesNotMatch(recover, /startBackgroundResearch/);

  const store = read("lib/pipeline/store.ts");
  const reset = store.split("export async function resetStaleResearchStarts")[1]?.split(
    "export async function getReportsByIds",
  )[0];
  assert.match(String(reset), /eq\(customerReports.status, "RESEARCH_STARTING"\)/);
  assert.match(String(reset), /isNull\(customerReports.openaiResponseId\)/);
  assert.match(String(reset), /status: "RECEIVED"/);

  const cron = read("app/api/cron/recover-research/route.ts");
  assert.match(cron, /recoverStuckResearchJobs/);
  const vercel = read("vercel.json");
  assert.match(vercel, /\/api\/cron\/recover-research/);
});

test("queued historical imports stay idle; admin can start selected records", () => {
  assert.equal(
    isQueuedForAutoResearch({ status: "RECEIVED", autoResearch: true }),
    true,
  );
  assert.equal(
    isQueuedForAutoResearch({ status: "RECEIVED", autoResearch: false }),
    false,
  );
  assert.equal(
    isQueuedForAutoResearch({
      status: "RECEIVED",
      autoResearch: true,
      openaiResponseId: "resp_1",
    }),
    false,
  );

  const runSelected = read("app/api/admin/reports/run-selected/route.ts");
  assert.match(runSelected, /startResearch\(id\)/);
  assert.match(runSelected, /for \(const id of ids\)/);
});

test("admin dashboard surfaces queued, generating, ready, draft, and last progress", () => {
  const page = read("app/admin/submissions/page.tsx");
  assert.match(page, /Queued/);
  assert.match(page, /Generating/);
  assert.match(page, /Ready for review/);
  assert.match(page, /isQueuedForAutoResearch/);
  assert.match(page, /GENERATING_STATUSES/);

  const table = read("app/admin/submissions/SubmissionsTable.tsx");
  assert.match(table, /gmailDraftUrl/);
  assert.match(table, /@\/lib\/google\/urls/);
  assert.doesNotMatch(table, /@\/lib\/google\/gmail/);
  assert.match(table, /report.updatedAt/);
  assert.match(table, /opportunityLabel/);
  assert.doesNotMatch(table, /sendGmailMessage/);
});

test("Katie QA and shared Scan\/Plan validation remain on the automatic completion path", () => {
  const complete = read("lib/pipeline/complete.ts");
  assert.match(complete, /applySavingsIntegrity/);
  assert.match(complete, /editorialQualityIssues/);
  assert.match(complete, /freeScanLeakFlags|freeScanFlags/);
  assert.match(complete, /summarizeDisplaySavings/);
  const recover = read("lib/pipeline/recover.ts");
  assert.match(recover, /storeCompletedResearch/);
  assert.match(recover, /generateAndUploadPdfs/);
});
