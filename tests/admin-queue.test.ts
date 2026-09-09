import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { writingFingerprint } from "../lib/pipeline/artifacts.ts";
import {
  decideDelete,
  decideMarkSent,
  decideRestore,
  decideUnmarkSent,
  hasPaidDeliveryRecord,
  isSentInQueue,
  matchesQueueView,
  parseQueueView,
  type QueueReport,
} from "../lib/pipeline/admin-queue.ts";

const openaiResponseId = "resp_current";
const offerMode = "SCAN_UPSELL" as const;
const fingerprint = writingFingerprint({ openaiResponseId, offerMode });

function report(patch: Partial<QueueReport> = {}): QueueReport {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    firstName: "Ada",
    email: "ada@example.com",
    status: "RECEIVED",
    offerMode,
    source: "webhook",
    ...patch,
  };
}

function readyReport(patch: Partial<QueueReport> = {}): QueueReport {
  return report({
    status: "GMAIL_DRAFT_READY",
    openaiResponseId,
    writingJson: { ok: true },
    writingFingerprint: fingerprint,
    driveScanFileId: "scan",
    drivePlanFileId: "plan",
    pdfsReadyAt: new Date("2026-09-08T12:00:00Z"),
    pdfsFingerprint: fingerprint,
    gmailDraftId: "draft",
    draftReadyAt: new Date("2026-09-08T12:05:00Z"),
    draftFingerprint: fingerprint,
    ...patch,
  });
}

test("To do, Sent, and All hide deleted records and keep paid delivery in Sent", () => {
  const todo = report();
  const marked = readyReport({ initialReportSentAt: new Date("2026-09-07T15:00:00Z") });
  const paid = readyReport({
    status: "PLAN_DELIVERED",
    gmailPaidMessageId: "msg_paid",
    planDeliveredAt: new Date("2026-09-08T18:00:00Z"),
  });
  const deleted = report({ deletedAt: new Date() });

  assert.equal(parseQueueView(undefined), "todo");
  assert.equal(matchesQueueView(todo, "todo"), true);
  assert.equal(matchesQueueView(marked, "todo"), false);
  assert.equal(matchesQueueView(paid, "todo"), false);
  assert.equal(matchesQueueView(deleted, "todo"), false);
  assert.equal(matchesQueueView(marked, "sent"), true);
  assert.equal(matchesQueueView(paid, "sent"), true);
  assert.equal(matchesQueueView(todo, "sent"), false);
  assert.equal(matchesQueueView(deleted, "sent"), false);
  assert.equal(matchesQueueView(todo, "all"), true);
  assert.equal(matchesQueueView(paid, "all"), true);
  assert.equal(matchesQueueView(deleted, "all"), false);
  assert.equal(matchesQueueView(deleted, "deleted"), true);
  assert.equal(isSentInQueue(paid), true);
  assert.equal(hasPaidDeliveryRecord(paid), true);
});

test("bulk Mark sent records the actual timestamp and offer-mode delivery type", () => {
  const sentAt = new Date("2026-09-07T16:30:00Z");
  const freeFingerprint = writingFingerprint({ openaiResponseId, offerMode: "FULL_PLAN_FREE" });
  const decision = decideMarkSent(
    readyReport({
      offerMode: "FULL_PLAN_FREE",
      status: "FREE_PLAN_READY",
      writingFingerprint: freeFingerprint,
      pdfsFingerprint: freeFingerprint,
      draftFingerprint: freeFingerprint,
    }),
    { sentAt },
  );
  assert.deepEqual(decision, { action: "mark", sentAt, deliveryType: "FULL_PLAN_FREE" });
});

test("repeated Mark sent is idempotent and does not overwrite the original timestamp", () => {
  const original = new Date("2026-09-07T16:30:00Z");
  const later = new Date("2026-09-09T12:00:00Z");
  const already = readyReport({ initialReportSentAt: original, initialReportDeliveryType: "SCAN_UPSELL" });
  assert.deepEqual(decideMarkSent(already, { sentAt: later }), {
    action: "skip",
    reason: "already-marked",
  });
});

test("Mark sent can correct an existing timestamp when requested", () => {
  const original = new Date("2026-09-07T16:30:00Z");
  const corrected = new Date("2026-09-06T11:00:00Z");
  const already = readyReport({ initialReportSentAt: original, initialReportDeliveryType: "SCAN_UPSELL" });
  assert.deepEqual(decideMarkSent(already, { sentAt: corrected, correct: true }), {
    action: "correct",
    sentAt: corrected,
    deliveryType: "SCAN_UPSELL",
  });
});

test("undo only clears manual tracking and leaves paid delivery sent", () => {
  const manual = readyReport({ initialReportSentAt: new Date() });
  const paid = readyReport({
    status: "PLAN_DELIVERED",
    gmailPaidMessageId: "msg_paid",
    planDeliveredAt: new Date(),
  });
  assert.deepEqual(decideUnmarkSent(manual), { action: "unmark" });
  assert.deepEqual(decideUnmarkSent(paid), { action: "skip", reason: "paid-delivery" });
});

test("unfinished reports are not marked sent without an explicit override", () => {
  assert.deepEqual(decideMarkSent(report({ offerMode: "SCAN_UPSELL" })), {
    action: "skip",
    reason: "not-ready",
  });
  const overridden = decideMarkSent(report({ offerMode: "SCAN_UPSELL" }), { override: true });
  assert.equal(overridden.action, "mark");
});

test("paid Stripe delivery is treated as Sent and is not given a new manual send", () => {
  const paid = readyReport({
    status: "PLAN_DELIVERED",
    gmailPaidMessageId: "msg_paid",
    planDeliveredAt: new Date("2026-09-08T18:00:00Z"),
  });
  assert.equal(matchesQueueView(paid, "sent"), true);
  assert.deepEqual(decideMarkSent(paid), { action: "skip", reason: "already-paid" });
});

test("soft delete hides records and restore puts them back", () => {
  const active = report();
  const deleted = report({ deletedAt: new Date() });
  assert.deepEqual(decideDelete(active), { action: "delete" });
  assert.deepEqual(decideDelete(deleted), { action: "skip", reason: "already-deleted" });
  assert.deepEqual(decideRestore(deleted), { action: "restore" });
  assert.deepEqual(decideRestore(active), { action: "skip", reason: "not-deleted" });
  assert.equal(matchesQueueView(deleted, "todo"), false);
  assert.equal(matchesQueueView(deleted, "all"), false);
});

test("active jobs and real payments are protected from casual deletion", () => {
  const activeJob = report({
    jobKind: "pdfs",
    jobStartedAt: new Date(),
  });
  const paid = report({
    purchasedAt: new Date(),
    stripePaymentStatus: "paid",
    status: "PURCHASED",
  });
  const internalPaidTest = report({
    source: "internal-test",
    status: "PLAN_DELIVERED",
    gmailPaidMessageId: "msg_test",
    planDeliveredAt: new Date(),
  });
  assert.deepEqual(decideDelete(activeJob), { action: "block", reason: "active-job" });
  assert.deepEqual(decideDelete(activeJob, { forceActiveJob: true }), { action: "delete" });
  assert.deepEqual(decideDelete(paid), { action: "block", reason: "paid-protected" });
  assert.deepEqual(decideDelete(paid, { confirmPaid: true }), { action: "delete" });
  assert.deepEqual(decideDelete(internalPaidTest), { action: "delete" });
});

test("Tally upsert keeps deleted and manual sent fields on existing rows", () => {
  const store = fs.readFileSync(path.join(process.cwd(), "lib/pipeline/store.ts"), "utf8");
  const updateBlock = store.split("if (existing)")[1]?.split("return { report: updated")[0] ?? "";
  assert.match(updateBlock, /deletedAt: existing\.deletedAt/);
  assert.match(updateBlock, /initialReportSentAt: existing\.initialReportSentAt/);
  assert.match(updateBlock, /initialReportDeliveryType: existing\.initialReportDeliveryType/);
  assert.match(store, /isNull\(customerReports\.deletedAt\)/);
});

test("admin queue actions do not send Gmail, charge Stripe, or start research/PDFs", () => {
  const actions = fs.readFileSync(path.join(process.cwd(), "lib/pipeline/admin-queue-actions.ts"), "utf8");
  const markRoute = fs.readFileSync(path.join(process.cwd(), "app/api/admin/reports/mark-sent/route.ts"), "utf8");
  const deleteRoute = fs.readFileSync(
    path.join(process.cwd(), "app/api/admin/reports/delete-selected/route.ts"),
    "utf8",
  );
  for (const source of [actions, markRoute, deleteRoute]) {
    assert.doesNotMatch(source, /sendGmailMessage|fulfillPaidPlan|startResearch|generateAndUploadPdfs|upsertGmailDraft/);
  }
});
