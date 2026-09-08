import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  CHECKOUT_LINK_LABEL,
  SCAN_UPSELL_SUBJECT,
  assertDraftCopySafe,
  buildInitialDraftEmail,
  buildPaidPlanEmail,
  highLevelFindingsPhrase,
  initialDraftAttachmentKind,
  visibleEmailHtml,
} from "../lib/copy/emails.ts";
import { buildRawEmail } from "../lib/google/mime.ts";
import { countPdfPages } from "../lib/google/pdf-pages.ts";

const checkoutUrl =
  "https://buy.stripe.com/test_abc?client_reference_id=rid&locked_prefilled_email=ada%40example.com";

test("SCAN_UPSELL HTML uses a friendly checkout link and hides the raw Stripe URL", () => {
  const email = buildInitialDraftEmail({
    firstName: "Ada",
    offerMode: "SCAN_UPSELL",
    savingsRange: "$250-$400",
    mountains: ["Sugarbush", "Breck"],
    findings: ["Something worth a look at Sugarbush", "Breck only if you actually go"],
    checkoutUrl,
    coreSavingsLow: 250,
    planPageCount: 8,
  });

  assert.equal(email.subject, SCAN_UPSELL_SUBJECT);
  assert.match(email.body, /Hey Ada,/);
  assert.match(email.body, /around Sugarbush and Breck/);
  assert.match(email.body, /something worth a look at Sugarbush and Breck only if you actually go/i);
  assert.match(email.body, /roughly \$250-\$400 worth a look/);
  assert.equal((email.body.match(/\$250-\$400/g) ?? []).length, 1);
  assert.match(email.body, /8-page Savings Plan/);
  assert.match(email.body, new RegExp(checkoutUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(
    email.html.includes(`<a href="${checkoutUrl.replace(/&/g, "&amp;")}">${CHECKOUT_LINK_LABEL}</a>`),
    true,
  );
  assert.equal(visibleEmailHtml(email.html).includes("buy.stripe.com"), false);
  assert.equal(visibleEmailHtml(email.html).includes(CHECKOUT_LINK_LABEL), true);
  assert.doesNotMatch(email.body.replace(checkoutUrl, ""), /internal id|report id/i);
  assert.doesNotMatch(visibleEmailHtml(email.html), /client_reference_id|internal id/i);
  assert.equal(email.body.includes("\u2014"), false);
  assert.equal(
    assertDraftCopySafe({
      offerMode: "SCAN_UPSELL",
      body: email.body,
      html: email.html,
      checkoutUrl,
    }).length,
    0,
  );
});

test("SCAN_UPSELL keeps the paid-content boundary and omits unsafe findings", () => {
  const email = buildInitialDraftEmail({
    firstName: "Ada",
    offerMode: "SCAN_UPSELL",
    savingsRange: "$250-$400",
    mountains: ["Sugarbush"],
    findings: [
      "Buy the $119 lesson before October 12 using https://secret.example.com",
      "Something worth a look at Sugarbush",
    ],
    checkoutUrl,
    coreSavingsLow: 250,
  });
  assert.doesNotMatch(email.body, /\$119|October 12|secret\.example\.com/i);
  assert.match(email.body, /something worth a look at Sugarbush/i);
  assert.doesNotMatch(visibleEmailHtml(email.html), /\$119|October 12|secret\.example/i);
});

test("SCAN_UPSELL omits a guessed page count when the Plan PDF count is unavailable", () => {
  const email = buildInitialDraftEmail({
    firstName: "Ada",
    offerMode: "SCAN_UPSELL",
    savingsRange: "$250-$400",
    checkoutUrl,
    coreSavingsLow: 250,
    planPageCount: null,
  });
  assert.match(email.body, /the full Savings Plan/);
  assert.doesNotMatch(email.body, /\d+-page Savings Plan/);
});

test("page count is derived from the actual Plan PDF bytes", () => {
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<< /Type /Pages /Count 11 /Kids [] >>endobj\n");
  assert.equal(countPdfPages(pdf), 11);
  assert.equal(countPdfPages(Buffer.from("not a pdf")), null);

  const email = buildInitialDraftEmail({
    firstName: "Ada",
    offerMode: "SCAN_UPSELL",
    savingsRange: "$250-$400",
    checkoutUrl,
    coreSavingsLow: 250,
    planPageCount: countPdfPages(pdf),
  });
  assert.match(email.body, /11-page Savings Plan/);
});

test("multipart email includes HTML and a usable plain-text URL", () => {
  const email = buildInitialDraftEmail({
    firstName: "Ada",
    offerMode: "SCAN_UPSELL",
    savingsRange: "$250-$400",
    checkoutUrl,
    coreSavingsLow: 250,
  });
  const raw = buildRawEmail({
    from: "Ben <ben@example.com>",
    to: "ada@example.com",
    subject: email.subject,
    text: email.body,
    html: email.html,
    attachments: [{ filename: "scan.pdf", contentType: "application/pdf", bytes: Buffer.from("%PDF") }],
  });
  const decoded = Buffer.from(raw, "base64url").toString("utf8");
  assert.match(decoded, /multipart\/alternative/);
  assert.match(decoded, /text\/plain/);
  assert.match(decoded, /text\/html/);
  assert.match(decoded, /Get the full Savings Plan for \$49/);
  assert.match(decoded, /buy\.stripe\.com/);
});

test("FULL_PLAN_FREE draft has no Stripe link or $49 language", () => {
  const email = buildInitialDraftEmail({
    firstName: "Ada",
    offerMode: "FULL_PLAN_FREE",
    savingsRange: "$40-$60",
    mountains: ["Bolton Valley"],
    personalizedObservation: "Your local pass setup was pretty straightforward",
    coreSavingsLow: 40,
  });
  assert.match(email.body, /complete Savings Plan/);
  assert.match(email.body, /around Bolton Valley/);
  assert.match(email.body, /just reply/);
  assert.doesNotMatch(email.body, /\$49/);
  assert.doesNotMatch(email.html, /\$49/);
  assert.doesNotMatch(email.body, /stripe|checkout/i);
  assert.doesNotMatch(email.html, /stripe|checkout|href=/i);
  assert.doesNotMatch(email.body, /wasn't enough to sell|not going to try to sell/i);
  assert.equal(
    assertDraftCopySafe({ offerMode: "FULL_PLAN_FREE", body: email.body, html: email.html }).length,
    0,
  );
});

test("FULL_PLAN_FREE with no firm savings stays honest and still attaches the Plan", () => {
  const email = buildInitialDraftEmail({
    firstName: "Ada",
    offerMode: "FULL_PLAN_FREE",
    savingsRange: "$413-$1,056",
    coreSavingsLow: 0,
  });
  assert.doesNotMatch(email.body, /\$413|\$1,056/);
  assert.match(email.body, /complete Savings Plan/);
  assert.doesNotMatch(email.body, /\$49/);
  assert.equal(initialDraftAttachmentKind("FULL_PLAN_FREE"), "plan");
  assert.equal(
    assertDraftCopySafe({ offerMode: "FULL_PLAN_FREE", body: email.body, html: email.html }).length,
    0,
  );
});

test("creating a draft email does not send mail", () => {
  buildInitialDraftEmail({
    firstName: "Ada",
    offerMode: "SCAN_UPSELL",
    savingsRange: "$250-$400",
    checkoutUrl,
    coreSavingsLow: 250,
  });
  const complete = fs.readFileSync(path.join(process.cwd(), "lib/pipeline/complete.ts"), "utf8");
  assert.match(complete, /upsertGmailDraft/);
  assert.doesNotMatch(complete, /sendGmailMessage/);
  assert.equal(highLevelFindingsPhrase(["Buy the $99 pass"]), null);
});

test("paid fulfillment reuses the saved Plan PDF and does not regenerate reports", () => {
  const fulfillment = fs.readFileSync(path.join(process.cwd(), "lib/pipeline/fulfillment.ts"), "utf8");
  assert.match(fulfillment, /downloadDriveFile\(report\.drivePlanFileId\)/);
  assert.match(fulfillment, /planFilename/);
  assert.doesNotMatch(fulfillment, /writeReportCopy|generateAndUploadPdfs|ensureCurrentWriting/);
  assert.doesNotMatch(fulfillment, /driveScanFileId|scanFilename/);
});

test("paid plan email is short, first person, and has no checkout CTA", () => {
  const email = buildPaidPlanEmail({
    firstName: "Ada",
    startHereRecommendation: "Get the Winter Park youth pass",
  });
  assert.equal(email.subject, "Your full Ski Savings Plan is ready");
  assert.match(email.body, /Hey Ada,/);
  assert.match(email.body, /My first recommendation: Get the Winter Park youth pass/);
  assert.doesNotMatch(email.body, /I'd start with Get the Winter Park youth pass/);
  assert.match(email.body, /worth the \$49/);
  assert.doesNotMatch(email.body, /buy\.stripe|Get the full Savings Plan for \$49/i);
  assert.doesNotMatch(email.html, /href=/i);
  assert.equal(email.body.includes("\u2014"), false);
  assert.doesNotMatch(email.body, /our team/i);
});

test("paid plan email omits an unsafe or missing recommendation", () => {
  const email = buildPaidPlanEmail({
    firstName: "Ada",
    startHereRecommendation: "Buy the $119 lesson at https://example.com",
  });
  assert.doesNotMatch(email.body, /I'd start with/);
  assert.doesNotMatch(email.body, /My first recommendation/);
  assert.doesNotMatch(email.body, /\$119|example\.com/);
});
