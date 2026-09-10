import type { OfferMode } from "@/lib/pipeline/status";
import { mentionsPaidPlanPrice, stripPaidPlanPriceMentions } from "@/lib/copy/scan-amounts";
import { conversationalMountainList, withConversationalMountains } from "@/lib/copy/mountain-names";
import { stripEmDashes } from "@/lib/copy/sanitize";

export const SCAN_UPSELL_SUBJECT = "Your ski savings scan is ready ⛷️";
export const FREE_PLAN_SUBJECT = "Your ski savings plan is ready ⛷️";
export const CHECKOUT_LINK_LABEL = "Get the full Savings Plan for $49";
export const SUBMISSION_CONFIRMATION_SUBJECT = "I'm digging for your ski savings ⛷️";
export const REFUND_LANGUAGE =
  "And genuinely, if you get it and don't think it was worth $49 bucks, just reply and tell me. I'll refund it and you keep the Plan. No hoops or nonsense.";
export const FEEDBACK_PS =
  "ps. This is a new project so any feedback you're willing to share would be incredibly helpful! Do these work/fit for you? Did you already know about them? If you could wave a magic wand, what would make booking skiing for your family easier/cheaper?";

const FUNNEL_LANGUAGE =
  /\b(unlock(?:ing)? your savings|reveal(?:ing)? your savings|claim your savings|upgrade now|savings are locked|see what's hiding|don't miss out|access your savings|we've uncovered|waiting for you)\b/i;

export type DraftEmailInput = {
  firstName: string;
  offerMode: OfferMode;
  savingsRange: string;
  personalizedObservation?: string | null;
  emailOpening?: string | null;
  enthusiasmLevel?: "HIGH" | "MEDIUM" | "LOW" | "NONE" | string | null;
  checkoutUrl?: string | null;
  coreSavingsLow: number;
  mountains?: string[];
  findings?: string[];
  programs?: string[];
  extras?: string[];
  planPageCount?: number | null;
};

export type PaidEmailInput = {
  firstName: string;
  startHereRecommendation?: string | null;
};

export type DraftEmail = {
  subject: string;
  body: string;
  html: string;
};

export function buildSubmissionConfirmationEmail(firstName?: string | null): DraftEmail {
  const greetingName =
    stripEmDashes(firstName ?? "")
      .replace(/\s+/g, " ")
      .trim() || "there";
  const paragraphs = [
    `Hey ${greetingName},`,
    "Got your Ski Family Savings Scan submission! Thanks for trying this out.",
    "I'm digging into your family's situation now and looking for the programs, discounts, passes, and other savings that might make sense for how you ski.",
    "I work through scans in the order they're received, and most are completed within 2 business days. If I get an unusually big batch of requests, yours may take a little longer.",
    "As soon as your scan is ready, I'll send it over by email.",
    "Ben",
  ];
  const htmlParagraphs = paragraphs
    .map((paragraph, index) => {
      const margin = index === paragraphs.length - 1 ? "0" : "0 0 18px";
      return `<p style="margin:${margin};">${escapeEmailHtml(paragraph)}</p>`;
    })
    .join("");

  return {
    subject: SUBMISSION_CONFIRMATION_SUBJECT,
    body: paragraphs.join("\n\n"),
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;"><div style="max-width:600px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#202124;">${htmlParagraphs}</div></body></html>`,
  };
}

type EmailPart = { type: "text"; text: string } | { type: "link"; label: string; href: string };

export function scanUpsellSubject(): string {
  return SCAN_UPSELL_SUBJECT;
}

export function freePlanSubject(): string {
  return FREE_PLAN_SUBJECT;
}

export function paidPlanSubject(): string {
  return "Here's your Ski Savings Plan⛷️";
}

export function initialDraftAttachmentKind(offerMode: OfferMode): "scan" | "plan" {
  return offerMode === "SCAN_UPSELL" ? "scan" : "plan";
}

export function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function visibleEmailHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<a\b[^>]*>/gi, "")
    .replace(/<\/a>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikePaidDetail(text: string): boolean {
  return (
    /\$\d/.test(text) ||
    /\bhttps?:\/\//i.test(text) ||
    /\b[\w.-]+\.(com|org|net)\b/i.test(text) ||
    /\b(register by|blackout dates?|eligib|deadline|RFID|voucher|passport|promo code|half(?:-|\s)?price|\d+\s*(?:%|percent))\b/i.test(
      text,
    ) ||
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/i.test(
      text,
    )
  );
}

function isBlandEmailFinding(text: string): boolean {
  return /something worth a look|useful option here|worth checking|a couple of useful options/i.test(text);
}

function joinPhrase(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function mountainsPhrase(mountains: string[] | undefined): string {
  return joinPhrase(conversationalMountainList(mountains));
}

const GENERIC_EXAMPLE_WORDS = new Set([
  "pass",
  "passes",
  "ticket",
  "tickets",
  "pack",
  "access",
  "kids",
  "youth",
  "weekday",
  "weekdays",
  "lesson",
  "private",
  "extra",
  "only",
  "with",
  "from",
  "through",
  "family",
  "discount",
  "upgrade",
  "offer",
  "season",
  "days",
  "adult",
  "junior",
  "local",
  "swaps",
  "equipment",
  "lease",
  "gear",
  "options",
  "option",
  "mountains",
  "mountain",
]);

function exampleTokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z']{4,}/g) ?? []).filter((word) => !GENERIC_EXAMPLE_WORDS.has(word));
}

function overlapsChosenExample(candidate: string, chosen: string[]): boolean {
  const tokens = exampleTokens(candidate);
  if (tokens.length === 0) return false;
  return chosen.some((label) => {
    const have = new Set(exampleTokens(label));
    return tokens.some((token) => have.has(token));
  });
}

function cleanExampleLabel(text: string): string {
  return withConversationalMountains(
    stripEmDashes(text)
      .replace(/\b20\d{2}\s*\/\s*20\d{2}\b/g, "")
      .replace(/\b20\d{2}\s*\/\s*\d{2}\b/g, "")
      .replace(/\b20\d{2}-\d{2}\b/g, "")
      .replace(/\b20\d{2}\b/g, "")
      .replace(/^(start with|confirm the|check the)\s+/i, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .replace(/^\/\s*/, "")
      .replace(/\.+$/, ""),
  );
}

function isEmailSafeExample(text: string): boolean {
  if (text.length < 4 || text.length > 90) return false;
  if (looksLikePaidDetail(text) || isBlandEmailFinding(text)) return false;
  return true;
}

export function pickEmailExamples(options: {
  programs?: string[];
  findings?: string[];
  extras?: string[];
}): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const source of [
    ...(options.programs ?? []),
    ...(options.findings ?? []),
    ...(options.extras ?? []),
  ]) {
    const label = cleanExampleLabel(source);
    const key = label.toLowerCase();
    if (!isEmailSafeExample(label) || seen.has(key)) continue;
    if (overlapsChosenExample(label, labels)) continue;
    seen.add(key);
    labels.push(label);
    if (labels.length === 2) break;
  }
  return labels;
}

export function highLevelFindingsPhrase(findings: string[] | undefined): string | null {
  const cleaned = pickEmailExamples({ findings });
  if (cleaned.length === 0) return null;
  const [first, second] = cleaned;
  if (!second) return first!;
  return `${first} and ${second}`;
}

function findingsSentence(input: DraftEmailInput, mountains: string): string {
  const examples = pickEmailExamples({
    programs: input.programs,
    findings: input.findings,
    extras: input.extras,
  });
  const counted = input.coreSavingsLow > 0;
  if (examples.length === 2) {
    return counted
      ? `Looks like there's solid savings starting with ${examples[0]} and ${examples[1]}.`
      : `Looks like the useful checks start with ${examples[0]} and ${examples[1]}.`;
  }
  if (examples.length === 1) {
    return counted
      ? `Looks like there's solid savings starting with ${examples[0]}.`
      : `Looks like the useful check starts with ${examples[0]}.`;
  }
  if (mountains) {
    return counted
      ? `Looks like there are a few options around ${mountains} worth a closer look.`
      : `Looks like there are a few options around ${mountains} still worth checking.`;
  }
  return counted
    ? "Looks like there are a few options worth a closer look."
    : "Looks like there are a few options still worth checking.";
}

function savingsSentence(input: DraftEmailInput): string | null {
  if (!(input.coreSavingsLow > 0 && input.savingsRange.trim())) return null;
  const range = input.savingsRange.trim();
  if (input.coreSavingsLow < 150) {
    return `I found a couple options that are worth a look, roughly ${range} savings.`;
  }
  return `I found a few solid options that are worth a look, roughly ${range} savings.`;
}

function planPhrase(planPageCount?: number | null): string {
  if (typeof planPageCount === "number" && Number.isInteger(planPageCount) && planPageCount > 0) {
    return `a full ${planPageCount}-page Savings Plan`;
  }
  return "a full Savings Plan";
}

function openingSentence(mountains: string): string {
  if (mountains) {
    return `I put together what I found around ${mountains} to help save some $$ this season.`;
  }
  return "I put together what I found for your season to help save some $$.";
}

function renderPlain(parts: EmailPart[]): string {
  return stripEmDashes(
    parts
      .map((part) => (part.type === "link" ? `${part.label}\n${part.href}` : part.text))
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n"),
  );
}

function renderHtml(parts: EmailPart[]): string {
  const inner = parts
    .map((part) => {
      if (part.type === "link") {
        return `<p><a href="${escapeEmailHtml(part.href)}">${escapeEmailHtml(part.label)}</a></p>`;
      }
      return part.text
        .split("\n\n")
        .map((paragraph) => `<p>${escapeEmailHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
        .join("");
    })
    .join("");
  return `<!DOCTYPE html><html><body>${inner}</body></html>`;
}

function fromParts(subject: string, parts: EmailPart[]): DraftEmail {
  return {
    subject: stripEmDashes(subject),
    body: renderPlain(parts),
    html: renderHtml(parts),
  };
}

export function buildInitialDraftEmail(input: DraftEmailInput): DraftEmail {
  const firstName = input.firstName || "there";
  const mountains = mountainsPhrase(input.mountains);
  const opening = openingSentence(mountains);
  const findings = findingsSentence(input, mountains);
  const savings = savingsSentence(input);

  if (input.offerMode === "SCAN_UPSELL") {
    const parts: EmailPart[] = [
      { type: "text", text: `Hey ${firstName},` },
      { type: "text", text: opening },
      { type: "text", text: findings },
    ];
    if (savings) parts.push({ type: "text", text: savings });
    parts.push(
      { type: "text", text: "I attached your Savings Scan here." },
      {
        type: "text",
        text: `I also put together ${planPhrase(input.planPageCount)} with the exact programs, who qualifies, deadlines, fine print, blackouts, direct links, etc.`,
      },
    );
    if (input.checkoutUrl) {
      parts.push({ type: "link", label: CHECKOUT_LINK_LABEL, href: input.checkoutUrl });
    }
    parts.push(
      { type: "text", text: REFUND_LANGUAGE },
      { type: "text", text: "Ben" },
      { type: "text", text: FEEDBACK_PS },
    );
    return fromParts(scanUpsellSubject(), parts);
  }

  const parts: EmailPart[] = [
    { type: "text", text: `Hey ${firstName},` },
    { type: "text", text: opening },
    { type: "text", text: findings },
  ];
  if (savings) parts.push({ type: "text", text: savings });
  parts.push(
    {
      type: "text",
      text: "I attached your Savings Plan here. If you have questions, just reply.",
    },
    { type: "text", text: "Ben" },
    { type: "text", text: FEEDBACK_PS },
  );
  return fromParts(freePlanSubject(), parts);
}

export function safePaidRecommendation(value?: string | null): string | undefined {
  const text = stripEmDashes(value ?? "").trim().replace(/\.+$/, "");
  if (text.length < 4 || text.length > 90) return undefined;
  if (/\$\d/.test(text) || /\bhttps?:\/\//i.test(text) || /\b[\w.-]+\.(com|org|net)\b/i.test(text)) {
    return undefined;
  }
  return text;
}

export function buildPaidPlanEmail(input: PaidEmailInput): DraftEmail {
  const firstName = input.firstName || "there";
  const recommendation = safePaidRecommendation(input.startHereRecommendation);
  const parts: EmailPart[] = [
    { type: "text", text: `Hey ${firstName},` },
    {
      type: "text",
      text: "Thanks for grabbing the full Plan. I attached it here with the exact programs, prices, deadlines, fine print, and links.",
    },
  ];
  if (recommendation) {
    parts.push({
      type: "text",
      text: `First thing I'd do: ${recommendation}.`,
    });
  }
  parts.push(
    {
      type: "text",
      text: "If anything looks off or you want me to dig into another option, just reply.",
    },
    { type: "text", text: REFUND_LANGUAGE },
    { type: "text", text: "Ben" },
  );
  return fromParts(paidPlanSubject(), parts);
}

function htmlHasCheckoutHref(html: string, checkoutUrl: string): boolean {
  const escaped = escapeEmailHtml(checkoutUrl);
  return html.includes(`href="${escaped}"`) || html.includes(`href="${checkoutUrl}"`);
}

export function assertDraftCopySafe(options: {
  offerMode: OfferMode;
  body: string;
  html?: string;
  checkoutUrl?: string | null;
}): string[] {
  const issues: string[] = [];
  const body = options.body.toLowerCase();
  const html = options.html ?? "";
  const visibleHtml = html ? visibleEmailHtml(html) : "";
  const combined = `${options.body}\n${html}`;

  if (FUNNEL_LANGUAGE.test(combined)) {
    issues.push("email uses funnel language");
  }

  if (options.offerMode === "SCAN_UPSELL") {
    if (!/^hey\s+\S+,/i.test(options.body.trim())) {
      issues.push("SCAN_UPSELL email should start with Hey {name},");
    }
    if (!/i attached your savings scan/i.test(options.body)) {
      issues.push("SCAN_UPSELL email should say the Savings Scan is attached");
    }
    if (!/savings plan/i.test(options.body)) {
      issues.push("SCAN_UPSELL email should mention the Savings Plan");
    }
    if (!/no hoops or nonsense/i.test(options.body) || !/worth \$49 bucks/i.test(options.body)) {
      issues.push("SCAN_UPSELL email is missing the human refund language");
    }
    if (options.checkoutUrl && !options.body.includes(options.checkoutUrl)) {
      issues.push("SCAN_UPSELL email is missing the checkout URL");
    }
    if (options.checkoutUrl && html && !htmlHasCheckoutHref(html, options.checkoutUrl)) {
      issues.push("SCAN_UPSELL HTML is missing the checkout link");
    }
    if (html && /buy\.stripe\.com|checkout\.stripe\.com/i.test(visibleHtml)) {
      issues.push("visible HTML contains a raw Stripe URL");
    }
    const withoutAllowed = stripPaidPlanPriceMentions(
      options.body
        .replace(options.checkoutUrl ?? "", "")
        .replace(/roughly\s+[^.]+?(?:worth a look|savings)/gi, "")
        .replace(/worth \$49 bucks/gi, ""),
    );
    if (/\$(?!\s)\d/.test(withoutAllowed) || /\bhttps?:\/\//i.test(withoutAllowed)) {
      issues.push("SCAN_UPSELL email includes paid program details");
    }
  }

  if (options.offerMode === "FULL_PLAN_FREE") {
    if (mentionsPaidPlanPrice(combined) || /stripe|checkout|buy\.stripe/i.test(combined)) {
      issues.push("FULL_PLAN_FREE email contains purchase language");
    }
    if (/wasn't enough to sell|not enough to charge|couldn't find enough/i.test(combined)) {
      issues.push("FULL_PLAN_FREE email frames the result around not selling");
    }
    if (/get the full savings plan/i.test(combined)) {
      issues.push("FULL_PLAN_FREE email includes upsell language");
    }
    if (/worth \$49 bucks|no hoops or nonsense/i.test(combined)) {
      issues.push("FULL_PLAN_FREE email includes a paid refund pitch");
    }
  }

  if (body.includes("our team") || body.includes("our system") || body.includes("we analyzed")) {
    issues.push("email uses corporate we/our-team language");
  }

  if (options.body.includes("\u2014") || html.includes("\u2014")) {
    issues.push("email contains an em dash");
  }

  if (/\b(report id|internal id|uuid)\b/i.test(`${options.body}\n${visibleHtml}`)) {
    issues.push("email includes internal report information");
  }

  if (/\byou will save\b|\bguaranteed \$\d|\bclaim your guaranteed\b/i.test(combined)) {
    issues.push("email treats savings as guaranteed");
  }

  return issues;
}
