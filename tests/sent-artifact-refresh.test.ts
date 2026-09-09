import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  decideSentArtifactRefresh,
  SENT_ARTIFACT_REFRESH_MESSAGE,
} from "../lib/pipeline/admin-queue.ts";

const root = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("unsent reports may refresh artifacts without confirmation", () => {
  assert.deepEqual(decideSentArtifactRefresh({ initialReportSentAt: null }, { mode: "auto" }), {
    action: "allow",
  });
  assert.deepEqual(decideSentArtifactRefresh({ initialReportSentAt: null }, { mode: "explicit" }), {
    action: "allow",
  });
});

test("automatic recovery and bulk refresh skip already-sent reports", () => {
  const sent = { initialReportSentAt: new Date("2026-09-09T15:22:00Z") };
  assert.deepEqual(decideSentArtifactRefresh(sent, { mode: "auto" }), {
    action: "skip",
    reason: "initial-report-sent",
  });
  assert.deepEqual(decideSentArtifactRefresh(sent, { mode: "auto", confirmReplaceSent: false }), {
    action: "skip",
    reason: "initial-report-sent",
  });
});

test("explicit regeneration of a sent report requires confirmation", () => {
  const sent = { initialReportSentAt: new Date("2026-09-09T15:22:00Z") };
  assert.deepEqual(decideSentArtifactRefresh(sent, { mode: "explicit" }), {
    action: "confirm",
    reason: "initial-report-sent",
    message: SENT_ARTIFACT_REFRESH_MESSAGE,
  });
  assert.match(SENT_ARTIFACT_REFRESH_MESSAGE, /already marked Sent/);
  assert.match(SENT_ARTIFACT_REFRESH_MESSAGE, /Drive PDFs/);
  assert.match(SENT_ARTIFACT_REFRESH_MESSAGE, /Gmail draft/);
  assert.match(SENT_ARTIFACT_REFRESH_MESSAGE, /no email will be sent/i);
});

test("confirmed explicit regeneration is allowed and still does not clear sent tracking", () => {
  const sent = { initialReportSentAt: new Date("2026-09-09T15:22:00Z") };
  assert.deepEqual(
    decideSentArtifactRefresh(sent, { mode: "explicit", confirmReplaceSent: true }),
    { action: "allow" },
  );
  assert.deepEqual(
    decideSentArtifactRefresh(sent, { mode: "auto", confirmReplaceSent: true }),
    { action: "allow" },
  );
});

test("recovery, cron listing, and startResearch skip sent records before regenerating artifacts", () => {
  const recover = read("lib/pipeline/recover.ts");
  const recoverFn = recover.split("export async function recoverExistingResearch")[1]?.split(
    "export async function recoverStuckResearchJobs",
  )[0];
  assert.ok(recoverFn);
  const sentIdx = recoverFn.indexOf("hasManualInitialSend");
  const retrieveIdx = recoverFn.indexOf("retrieveResearch");
  const pdfIdx = recoverFn.indexOf("generateAndUploadPdfs");
  assert.ok(sentIdx >= 0 && sentIdx < retrieveIdx);
  assert.ok(sentIdx < pdfIdx);

  const store = read("lib/pipeline/store.ts");
  assert.match(store, /isNull\(customerReports\.initialReportSentAt\)/);
  const recoverable = store.split("export async function listRecoverableResearchReports")[1]?.split(
    "export async function getReportsByIds",
  )[0];
  const waiting = store.split("export async function listWaitingResearchReports")[1]?.split(
    "export async function listRecoverableResearchReports",
  )[0];
  assert.match(String(recoverable), /isNull\(customerReports\.initialReportSentAt\)/);
  assert.match(String(waiting), /isNull\(customerReports\.initialReportSentAt\)/);

  const research = read("lib/pipeline/research.ts");
  const startFn = research.split("export async function startResearch")[1]?.split(
    "export async function",
  )[0] ?? research.split("export async function startResearch")[1] ?? "";
  assert.match(startFn, /initial_report_sent/);
  assert.ok(startFn.indexOf("hasManualInitialSend") < startFn.indexOf("recoverExistingResearch"));
});

test("PDF and draft generation refuse sent records unless confirmReplaceSent is set", () => {
  const complete = read("lib/pipeline/complete.ts");
  const pdfsFn = complete.split("export async function generateAndUploadPdfs")[1]?.split(
    "export async function createInitialGmailDraft",
  )[0];
  const draftFn = complete.split("export async function createInitialGmailDraft")[1]?.split(
    "export async function continueAfterResearch",
  )[0];
  const continueFn = complete.split("export async function continueAfterResearch")[1] ?? "";
  assert.match(String(pdfsFn), /confirmReplaceSent/);
  assert.match(String(pdfsFn), /SentReportRefreshError/);
  assert.match(String(draftFn), /confirmReplaceSent/);
  assert.match(String(draftFn), /SentReportRefreshError/);
  assert.doesNotMatch(String(draftFn), /sendGmailMessage|fulfillPaidPlan/);
  assert.match(continueFn, /mode: "auto"/);
  assert.ok(continueFn.indexOf("decideSentArtifactRefresh") < continueFn.indexOf("generateAndUploadPdfs"));

  const pdfUpdate = String(pdfsFn).split("await updateReport(reportId, {")[1]?.split("})")[0] ?? "";
  const draftUpdate = String(draftFn).split("const updated = await updateReport(reportId, {")[1]?.split(
    "});",
  )[0] ?? "";
  for (const block of [pdfUpdate, draftUpdate]) {
    assert.doesNotMatch(block, /initialReportSentAt|initialReportDeliveryType|gmailPaidMessageId|purchasedAt|stripePaymentStatus|planDeliveredAt/);
  }
});

test("admin PDF and draft routes require confirmation and return sent_protected", () => {
  const artifacts = read("lib/pipeline/artifacts.ts");
  assert.match(artifacts, /readonly action = "sent_protected"/);
  for (const rel of [
    "app/api/admin/reports/[id]/pdfs/route.ts",
    "app/api/admin/reports/[id]/draft/route.ts",
  ]) {
    const source = read(rel);
    assert.match(source, /confirmReplaceSent/);
    assert.match(source, /SentReportRefreshError/);
    assert.match(source, /action: error\.action/);
    assert.match(source, /status: 409/);
  }
});

test("admin UI warns before replacing sent Drive artifacts or a saved draft", () => {
  const detail = read("app/admin/submissions/[id]/SubmissionActions.tsx");
  const table = read("app/admin/submissions/SubmissionsTable.tsx");
  for (const source of [detail, table]) {
    assert.match(source, /SENT_ARTIFACT_REFRESH_MESSAGE/);
    assert.match(source, /window\.confirm/);
    assert.match(source, /confirmReplaceSent: true/);
    assert.match(source, /sent_protected/);
  }
  assert.doesNotMatch(detail, /Kylie|kylie/);
  assert.doesNotMatch(table, /Kylie|kylie/);
  assert.doesNotMatch(read("lib/pipeline/admin-queue.ts"), /Kylie|kylie/);
  assert.doesNotMatch(read("lib/pipeline/complete.ts"), /Kylie|kylie/);
  assert.doesNotMatch(read("lib/pipeline/recover.ts"), /Kylie|kylie/);
});
