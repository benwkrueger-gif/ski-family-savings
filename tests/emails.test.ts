import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  CHECKOUT_LINK_LABEL,
  FEEDBACK_PS,
  FREE_PLAN_SUBJECT,
  REFUND_LANGUAGE,
  SCAN_UPSELL_SUBJECT,
  assertDraftCopySafe,
  buildInitialDraftEmail,
  buildPaidPlanEmail,
  highLevelFindingsPhrase,
  initialDraftAttachmentKind,
  paidPlanSubject,
  visibleEmailHtml,
} from "../lib/copy/emails.ts";
import { conversationalMountainName } from "../lib/copy/mountain-names.ts";
import { buildRawEmail } from "../lib/google/mime.ts";
import { countPdfPages } from "../lib/google/pdf-pages.ts";

const checkoutUrl =
  "https://buy.stripe.com/test_abc?client_reference_id=rid&locked_prefilled_email=ada%40example.com";

test("all report-delivery subjects include the ski emoji", () => {
  assert.equal(SCAN_UPSELL_SUBJECT, "Your ski savings scan is ready ⛷️");
  assert.equal(FREE_PLAN_SUBJECT, "Your ski savings plan is ready ⛷️");
  assert.equal(paidPlanSubject(), "Here's your Ski Savings Plan⛷️");
});

test("SCAN_UPSELL HTML uses a friendly checkout link and hides the raw Stripe URL", () => {
  const email = buildInitialDraftEmail({
    firstName: "Ada",
    offerMode: "SCAN_UPSELL",
    savingsRange: "$250-$400",
    mountains: ["Sugarbush Resort", "Breckenridge Ski Resort"],
    findings: ["Kids' season access at Sugarbush", "Breck only if you actually go"],
    programs: ["Sugarbush Weekday Family Day", "Killington Vermont Resident Weekdays"],
    checkoutUrl,
    coreSavingsLow: 250,
    planPageCount: 8,
  });

  assert.equal(email.subject, SCAN_UPSELL_SUBJECT);
  assert.match(email.body, /^Hey Ada,/m);
  assert.match(email.body, /around Sugarbush and Breck/);
  assert.doesNotMatch(email.body, /Sugarbush Resort|Breckenridge Ski Resort/);
  assert.match(email.body, /Sugarbush Weekday Family Day and Killington Vermont Resident Weekdays/);
  assert.match(email.body, /roughly \$250-\$400 savings/);
  assert.equal((email.body.match(/\$250-\$400/g) ?? []).length, 1);
  assert.match(email.body, /I attached your Savings Scan here/);
  assert.match(email.body, /8-page Savings Plan/);
  assert.match(email.body, /exact programs, who qualifies, deadlines, fine print, blackouts, direct links/);
  assert.equal(email.body.includes(REFUND_LANGUAGE), true);
  assert.match(email.body, /\n\nBen\n\n/);
  assert.equal(email.body.includes(FEEDBACK_PS), true);
  assert.match(email.body, new RegExp(checkoutUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(
    email.html.includes(`<a href="${checkoutUrl.replace(/&/g, "&amp;")}">${CHECKOUT_LINK_LABEL}</a>`),
    true,
  );
  assert.equal(visibleEmailHtml(email.html).includes("buy.stripe.com"), false);
  assert.equal(visibleEmailHtml(email.html).includes(CHECKOUT_LINK_LABEL), true);
  assert.doesNotMatch(email.body.replace(checkoutUrl, ""), /internal id|report id/i);
  assert.doesNotMatch(visibleEmailHtml(email.html), /client_reference_id|internal id/i);
  assert.doesNotMatch(email.body, /unlock|reveal your savings|claim your savings|upgrade now/i);
  assert.doesNotMatch(email.body, /you will save|guaranteed \$/i);
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

test("email mountain names use skier-facing labels, not legal resort titles", () => {
  assert.equal(conversationalMountainName("Bolton Valley Resort"), "Bolton");
  assert.equal(conversationalMountainName("Burke Mountain Resort"), "Burke");
  assert.equal(conversationalMountainName("Dartmouth Skiway"), "Dartmouth");
  assert.equal(conversationalMountainName("Killington Resort"), "Killington");
  assert.equal(conversationalMountainName("Mad River Glen Cooperative"), "Mad River Glen");
  assert.equal(conversationalMountainName("Cochran's Ski Area"), "Cochran's");
  assert.equal(conversationalMountainName("Cannon Mountain"), "Cannon");
  const email = buildInitialDraftEmail({
    firstName: "Ada",
    offerMode: "SCAN_UPSELL",
    savingsRange: "$300",
    mountains: ["Bolton Valley Resort", "Burke Mountain Resort", "Dartmouth Skiway"],
    programs: ["Bolton Weekday Family Day", "Killington Vermont Resident Weekdays"],
    checkoutUrl,
    coreSavingsLow: 300,
  });
  assert.match(email.body, /around Bolton, Burke, and Dartmouth/);
  assert.doesNotMatch(email.body, /Bolton Valley Resort|Burke Mountain Resort|Dartmouth Skiway/);
});

test("unsafe counted program names fall back to Scan headings before optional extras", () => {
  const email = buildInitialDraftEmail({
    firstName: "Casey",
    offerMode: "SCAN_UPSELL",
    savingsRange: "$149-$214",
    mountains: ["Home Notch", "North Peak"],
    programs: ["North Peak Early Lesson Half-Price private-lesson offer"],
    findings: ["Start with a weekday private lesson at North Peak"],
    extras: ["Indy Base Add-On Pass through Home Notch"],
    checkoutUrl,
    coreSavingsLow: 149,
  });
  assert.match(email.body, /a weekday private lesson at North Peak and Indy Base Add-On Pass through Home Notch/);
  assert.doesNotMatch(email.body, /Half-Price|Start with a weekday/i);
});

test("SCAN_UPSELL keeps the paid-content boundary and omits unsafe findings", () => {
  const email = buildInitialDraftEmail({
    firstName: "Ada",
    offerMode: "SCAN_UPSELL",
    savingsRange: "$250-$400",
    mountains: ["Sugarbush"],
    findings: [
      "Buy the $119 lesson before October 12 using https://secret.example.com",
      "Kids' season access at Sugarbush",
    ],
    programs: ["Half-Price weekday lesson at Sugarbush"],
    checkoutUrl,
    coreSavingsLow: 250,
  });
  assert.doesNotMatch(email.body, /\$119|October 12|secret\.example\.com|Half-Price/i);
  assert.match(email.body, /Kids' season access at Sugarbush/);
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
    mountains: ["Bolton Valley Resort"],
    programs: ["Bolton weekday pass setup"],
    personalizedObservation: "Your local pass setup was pretty straightforward",
    coreSavingsLow: 40,
  });
  assert.match(email.body, /^Hey Ada,/m);
  assert.match(email.body, /I attached your Savings Plan here/);
  assert.match(email.body, /around Bolton/);
  assert.doesNotMatch(email.body, /Bolton Valley Resort/);
  assert.match(email.body, /just reply/);
  assert.match(email.body, /roughly \$40-\$60 savings/);
  assert.doesNotMatch(email.body, /\$49/);
  assert.doesNotMatch(email.html, /\$49/);
  assert.doesNotMatch(email.body, /stripe|checkout/i);
  assert.doesNotMatch(email.html, /stripe|checkout|href=/i);
  assert.doesNotMatch(email.body, /Get the full Savings Plan/);
  assert.doesNotMatch(email.body, /wasn't enough to sell|not going to try to sell/i);
  assert.doesNotMatch(email.body, /no hoops or nonsense|worth \$49 bucks/i);
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
  assert.match(email.body, /I attached your Savings Plan here/);
  assert.doesNotMatch(email.body, /\$49/);
  assert.equal(initialDraftAttachmentKind("FULL_PLAN_FREE"), "plan");
  assert.equal(
    assertDraftCopySafe({ offerMode: "FULL_PLAN_FREE", body: email.body, html: email.html }).length,
    0,
  );
});

test("FULL_PLAN_FREE copy checks do not treat $492 as the $49 Plan price", () => {
  assert.equal(
    assertDraftCopySafe({
      offerMode: "FULL_PLAN_FREE",
      body: "If a couple things still go your way, it could be about $76-$492.",
      html: "<p>If a couple things still go your way, it could be about $76-$492.</p>",
    }).length,
    0,
  );
  assert.ok(
    assertDraftCopySafe({
      offerMode: "FULL_PLAN_FREE",
      body: "Get the full Savings Plan for $49.",
      html: "",
    }).some((issue) => /purchase language|upsell/i.test(issue)),
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
  assert.match(complete, /buildInitialDraftEmail/);
  assert.match(complete, /highlightOpportunities/);
  assert.doesNotMatch(complete, /sendGmailMessage/);
  assert.equal(highLevelFindingsPhrase(["Buy the $99 pass"]), null);
  assert.deepEqual(
    highLevelFindingsPhrase(["2026/27 Indy Base Add-On Pass through Home Notch"]),
    "Indy Base Add-On Pass through Home Notch",
  );
});

test("funnel language is rejected by draft copy checks", () => {
  const issues = assertDraftCopySafe({
    offerMode: "SCAN_UPSELL",
    body: "Hey Ada,\n\nUnlock your savings and claim your savings now.\n",
    html: "",
    checkoutUrl,
  });
  assert.ok(issues.some((issue) => /funnel language/i.test(issue)));
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
  assert.equal(email.subject, "Here's your Ski Savings Plan⛷️");
  assert.match(email.body, /Hey Ada,/);
  assert.match(email.body, /First thing I'd do: Get the Winter Park youth pass/);
  assert.match(email.body, /worth \$49 bucks/);
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
