import assert from "node:assert/strict";
import { test } from "node:test";
import type { CustomerReport } from "../lib/db/schema.ts";
import {
  JOB_STALE_MS,
  artifactStatus,
  jobConflict,
  writingFingerprint,
} from "../lib/pipeline/artifacts.ts";
import { remainingEditorialMs } from "../lib/copy/editorial.ts";
import { initialDraftAttachmentKind } from "../lib/copy/emails.ts";

function report(patch: Partial<CustomerReport>): CustomerReport {
  return {
    id: "bd9a4d4d-7934-453f-b3f5-3783c5c773b6",
    tallyFormId: null,
    tallySubmissionId: "tally-1",
    tallyEventId: null,
    rawTallyJson: {},
    familyProfile: null,
    firstName: "Christina",
    email: "clyoung802@gmail.com",
    homeZip: null,
    familySummary: null,
    submittedAt: null,
    status: "GMAIL_DRAFT_READY",
    offerMode: "FULL_PLAN_FREE",
    offerModeReason: "below threshold",
    openaiResponseId: "resp_current",
    researchJson: { ok: true },
    coreSavingsLow: 0,
    coreSavingsHigh: 0,
    optionalSavingsLow: null,
    optionalSavingsHigh: null,
    confidence: "MEDIUM",
    humanReviewFlags: [],
    writingJson: null,
    writingFingerprint: null,
    writingCompletedAt: null,
    pdfsFingerprint: null,
    draftFingerprint: null,
    jobKind: null,
    jobStartedAt: null,
    driveFolderId: "folder",
    driveScanFileId: "scan-old",
    drivePlanFileId: "plan-old",
    scanFilename: "Savings Scan - Christina.pdf",
    planFilename: "Savings Plan - Christina.pdf",
    gmailDraftId: "r-old-draft",
    gmailPaidMessageId: null,
    stripeClientReferenceId: null,
    stripeCheckoutUrl: null,
    stripeCheckoutSessionId: null,
    stripePaymentStatus: null,
    stripePaidAt: null,
    lastError: null,
    lastErrorAt: null,
    receivedAt: new Date(),
    researchStartedAt: null,
    researchCompletedAt: new Date(),
    pdfStartedAt: null,
    pdfsReadyAt: new Date("2026-09-07T12:00:00Z"),
    draftReadyAt: new Date("2026-09-07T12:05:00Z"),
    purchasedAt: null,
    planDeliveringAt: null,
    planDeliveredAt: null,
    autoResearch: true,
    source: "webhook",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...patch,
  };
}

test("old Gmail draft is not current just because a draft id exists", () => {
  const artifacts = artifactStatus(report({}));
  assert.equal(artifacts.research, "current");
  assert.equal(artifacts.writing, "missing");
  assert.equal(artifacts.pdfs, "stale");
  assert.equal(artifacts.draft, "stale");
  assert.equal(artifacts.deliveryReady, false);
});

test("old SCAN_UPSELL Gmail draft is stale after offer mode becomes FULL_PLAN_FREE", () => {
  const currentWriting = writingFingerprint({
    openaiResponseId: "resp_current",
    offerMode: "FULL_PLAN_FREE",
  });
  const staleDraft = writingFingerprint({
    openaiResponseId: "resp_current",
    offerMode: "SCAN_UPSELL",
  });
  const artifacts = artifactStatus(
    report({
      offerMode: "FULL_PLAN_FREE",
      writingJson: { ok: true },
      writingFingerprint: currentWriting,
      writingCompletedAt: new Date(),
      pdfsFingerprint: currentWriting,
      draftFingerprint: staleDraft,
      gmailDraftId: "r-7282227846437892374",
      status: "GMAIL_DRAFT_READY",
    }),
  );
  assert.equal(artifacts.writing, "current");
  assert.equal(artifacts.pdfs, "current");
  assert.equal(artifacts.draft, "stale");
  assert.equal(artifacts.deliveryReady, false);
});

test("GMAIL_DRAFT_READY is stale when offer mode is FULL_PLAN_FREE", () => {
  const fingerprint = writingFingerprint({
    openaiResponseId: "resp_current",
    offerMode: "FULL_PLAN_FREE",
  });
  const artifacts = artifactStatus(
    report({
      writingJson: { ok: true },
      writingFingerprint: fingerprint,
      writingCompletedAt: new Date(),
      pdfsFingerprint: fingerprint,
      draftFingerprint: fingerprint,
      status: "GMAIL_DRAFT_READY",
    }),
  );
  assert.equal(artifacts.writing, "current");
  assert.equal(artifacts.pdfs, "current");
  assert.equal(artifacts.draft, "stale");
  assert.equal(artifacts.deliveryReady, false);
});

test("delivery is ready only when writing, PDFs, and draft fingerprints match", () => {
  const fingerprint = writingFingerprint({
    openaiResponseId: "resp_current",
    offerMode: "FULL_PLAN_FREE",
  });
  const artifacts = artifactStatus(
    report({
      status: "FREE_PLAN_READY",
      writingJson: { ok: true },
      writingFingerprint: fingerprint,
      writingCompletedAt: new Date(),
      pdfsFingerprint: fingerprint,
      draftFingerprint: fingerprint,
    }),
  );
  assert.equal(artifacts.deliveryReady, true);
  assert.equal(artifacts.draft, "current");
});

test("a second regeneration is blocked while a job is active", () => {
  const active = report({
    jobKind: "pdfs",
    jobStartedAt: new Date(),
    status: "WRITING",
  });
  assert.equal(jobConflict(active), "active");
  assert.equal(artifactStatus(active).jobActive, true);
});

test("a stale abandoned job can be recovered after the timeout window", () => {
  const stale = report({
    jobKind: "pdfs",
    jobStartedAt: new Date(Date.now() - JOB_STALE_MS - 1_000),
    status: "WRITING",
  });
  assert.equal(jobConflict(stale), "stale");
  assert.equal(artifactStatus(stale).jobActive, false);
});

test("editorial retry is skipped when the remaining budget is gone", () => {
  const startedAt = 1_000;
  assert.equal(remainingEditorialMs(120_000, startedAt, startedAt + 120_000), 0);
  assert.ok(remainingEditorialMs(120_000, startedAt, startedAt + 90_000) < 120_000);
});

test("FULL_PLAN_FREE attaches the Plan, not the Scan", () => {
  assert.equal(initialDraftAttachmentKind("FULL_PLAN_FREE"), "plan");
  assert.equal(initialDraftAttachmentKind("SCAN_UPSELL"), "scan");
});
