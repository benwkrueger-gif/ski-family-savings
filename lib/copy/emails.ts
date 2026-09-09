import type { OfferMode } from "@/lib/pipeline/status";
import { stripEmDashes } from "@/lib/copy/sanitize";

export const SCAN_UPSELL_SUBJECT = "Your ski savings scan is ready ⛷️";
export const FREE_PLAN_SUBJECT = "Your ski savings plan is ready ⛷️";
export const CHECKOUT_LINK_LABEL = "Get the full Savings Plan for $49";
export const SUBMISSION_CONFIRMATION_SUBJECT = "I'm digging for your ski savings ⛷️";

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
    /\b(register by|blackout dates?|eligib|deadline|RFID|voucher|passport)\b/i.test(text) ||
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/i.test(
      text,
    )
  );
}

function joinPhrase(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function mountainsPhrase(mountains: string[] | undefined): string {
  const names = (mountains ?? [])
    .map((item) => stripEmDashes(item).trim())
    .filter(Boolean)
    .slice(0, 3);
  return joinPhrase(names);
}

export function highLevelFindingsPhrase(findings: string[] | undefined): string | null {
  const cleaned = (findings ?? [])
    .map((item) => stripEmDashes(item).trim().replace(/\.+$/, ""))
    .filter((item) => item.length >= 4 && item.length <= 90 && !looksLikePaidDetail(item))
    .slice(0, 2);
  if (cleaned.length === 0) return null;
  const [first, second] = cleaned;
  if (!second) return first!.charAt(0).toLowerCase() + first!.slice(1);
  return `${first!.charAt(0).toLowerCase() + first!.slice(1)} and ${second.charAt(0).toLowerCase()}${second.slice(1)}`;
}

function planPhrase(planPageCount?: number | null): string {
  if (typeof planPageCount === "number" && Number.isInteger(planPageCount) && planPageCount > 0) {
    return `the full ${planPageCount}-page Savings Plan`;
  }
  return "the full Savings Plan";
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
  const around = mountains ? ` around ${mountains}` : "";

  if (input.offerMode === "SCAN_UPSELL") {
    const findings = highLevelFindingsPhrase(input.findings);
    const fallbackFindings = mountains ? `a couple of useful options around ${mountains}` : "a couple of useful options";
    const parts: EmailPart[] = [
      { type: "text", text: `Hey ${firstName},` },
      {
        type: "text",
        text: `I've put together a quick scan of your options${around} to help you save on this season's skiing.`,
      },
      {
        type: "text",
        text: `Looks like you can capture solid savings starting with ${findings ?? fallbackFindings}.`,
      },
    ];
    if (input.coreSavingsLow > 0 && input.savingsRange.trim()) {
      parts.push({
        type: "text",
        text: `I found some pretty good stuff for you. It looks like there's roughly ${input.savingsRange} worth a look.`,
      });
    }
    parts.push(
      { type: "text", text: "I attached the free Savings Scan here." },
      {
        type: "text",
        text: `I also put together ${planPhrase(input.planPageCount)} with the exact programs, who qualifies, deadlines, fine print, blackouts, direct links, etc.`,
      },
    );
    if (input.checkoutUrl) {
      parts.push({ type: "link", label: CHECKOUT_LINK_LABEL, href: input.checkoutUrl });
    }
    parts.push(
      {
        type: "text",
        text: "And genuinely, if you get it and don't think it was worth $49 bucks, just reply and tell me. I'll refund it and you keep the Plan. No hoops or nonsense.",
      },
      { type: "text", text: "Ben" },
    );
    return fromParts(scanUpsellSubject(), parts);
  }

  const parts: EmailPart[] = [
    { type: "text", text: `Hey ${firstName},` },
    {
      type: "text",
      text: `I've put together a look at your options${around} for this season.`,
    },
  ];
  if (input.coreSavingsLow > 0 && input.savingsRange.trim()) {
    parts.push({
      type: "text",
      text: `It looks like there's roughly ${input.savingsRange} worth a look.`,
    });
  }
  parts.push(
    {
      type: "text",
      text: "I attached the complete Savings Plan. If you have questions, just reply.",
    },
    { type: "text", text: "Ben" },
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
      text: "Thanks for grabbing the full Plan. I've attached it here with the exact programs, prices, deadlines, fine print, and links for your family.",
    },
  ];
  if (recommendation) {
    parts.push({
      type: "text",
      text: `My first recommendation: ${recommendation}.`,
    });
  }
  parts.push(
    {
      type: "text",
      text: "If anything looks off or you want me to dig into another option, just reply. Happy to help.",
    },
    {
      type: "text",
      text: "And if you get through it and don't feel like it was worth the $49, just tell me. I'll refund you and you keep the Plan. No hoops or nonsense.",
    },
    { type: "text", text: "Hope you guys have a great winter!" },
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

  if (options.offerMode === "SCAN_UPSELL") {
    if (options.checkoutUrl && !options.body.includes(options.checkoutUrl)) {
      issues.push("SCAN_UPSELL email is missing the checkout URL");
    }
    if (options.checkoutUrl && html && !htmlHasCheckoutHref(html, options.checkoutUrl)) {
      issues.push("SCAN_UPSELL HTML is missing the checkout link");
    }
    if (html && /buy\.stripe\.com|checkout\.stripe\.com/i.test(visibleHtml)) {
      issues.push("visible HTML contains a raw Stripe URL");
    }
    const withoutAllowed = options.body
      .replace(options.checkoutUrl ?? "", "")
      .replace(/\$49/g, "")
      .replace(/roughly\s+[^.]+worth a look/i, "");
    if (/\$(?!\s)\d/.test(withoutAllowed) || /\bhttps?:\/\//i.test(withoutAllowed)) {
      issues.push("SCAN_UPSELL email includes paid program details");
    }
  }

  if (options.offerMode === "FULL_PLAN_FREE") {
    const combined = `${options.body}\n${html}`;
    if (/\$49/.test(combined) || /stripe|checkout|buy\.stripe/i.test(combined)) {
      issues.push("FULL_PLAN_FREE email contains purchase language");
    }
    if (/wasn't enough to sell|not enough to charge|couldn't find enough/i.test(combined)) {
      issues.push("FULL_PLAN_FREE email frames the result around not selling");
    }
    if (/get the full savings plan/i.test(combined)) {
      issues.push("FULL_PLAN_FREE email includes upsell language");
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

  return issues;
}
