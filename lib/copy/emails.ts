import type { OfferMode } from "@/lib/pipeline/status";
import { stripEmDashes } from "@/lib/copy/sanitize";

export type DraftEmailInput = {
  firstName: string;
  offerMode: OfferMode;
  savingsRange: string;
  personalizedObservation?: string | null;
  emailOpening?: string | null;
  enthusiasmLevel?: "HIGH" | "MEDIUM" | "LOW" | "NONE" | string | null;
  checkoutUrl?: string | null;
  coreSavingsLow: number;
};

export type PaidEmailInput = {
  firstName: string;
};

function observationLine(value?: string | null): string {
  const text = stripEmDashes(value ?? "").trim();
  if (!text || /\bthe family\b/i.test(text)) return "";
  return text.endsWith(".") ? text : `${text}.`;
}

export function scanUpsellSubject(firstName: string): string {
  return stripEmDashes(`${firstName}, I found some ski savings for your family`);
}

export function freePlanSubject(firstName: string): string {
  return stripEmDashes(`${firstName}, here's what I found for your family`);
}

export function paidPlanSubject(): string {
  return "Your Ski Family Savings Plan ⛷️";
}

export function buildInitialDraftEmail(input: DraftEmailInput): { subject: string; body: string } {
  const firstName = input.firstName || "there";
  const observation = observationLine(input.personalizedObservation);

  if (input.offerMode === "SCAN_UPSELL") {
    const lines = [
      `Hey ${firstName},`,
      "",
      input.emailOpening || "Super glad you filled this out. I had fun looking through this one.",
      observation ? "" : null,
      observation || null,
      "",
      `I found some pretty good stuff for you. It looks like there's roughly ${input.savingsRange} worth a look based on the ski plans you sent me.`,
      "",
      "I attached the quick Savings Scan here.",
      "",
      "I also already put together the full Savings Plan with exactly what I found, who qualifies, deadlines, and direct links.",
      "",
      "If you want it, it's $49 here:",
      "",
      input.checkoutUrl ?? "",
      "",
      "And genuinely, if you get it and don't think it was worth the $49, just reply and tell me. I'll refund it. No hoops or weirdness.",
      "",
      "Hope this helps!",
      "",
      "Ben",
    ].filter((line) => line !== null);

    return {
      subject: scanUpsellSubject(firstName),
      body: stripEmDashes(lines.join("\n").replace(/\n{3,}/g, "\n\n")),
    };
  }

  const someSavings = input.coreSavingsLow > 0;
  const lines = someSavings
    ? [
        `Hey ${firstName},`,
        "",
        input.emailOpening || "Thanks for sending this over. I looked through your ski plans and found a few useful things.",
        observation ? "" : null,
        observation || null,
        "",
        "Nothing huge jumped out, but there are still a couple places you may be able to shave some money off the season. I went ahead and attached the full Savings Plan with everything I found, including the details and links.",
        "",
        "The nice thing is your current setup already looks pretty efficient.",
        "",
        "Hope this helps!",
        "",
        "Ben",
      ]
    : [
        `Hey ${firstName},`,
        "",
        input.emailOpening || "Thanks for sending this over. I looked through your ski plans and attached everything I found.",
        observation ? "" : null,
        observation || null,
        "",
        "I couldn't lock in a sure number yet, but there are a couple of things worth checking. I attached the full Savings Plan with everything I found, including the specific programs, links, and details.",
        "",
        "Hope this helps, and thanks for letting me take a look.",
        "",
        "Ben",
      ];

  return {
    subject: freePlanSubject(firstName),
    body: stripEmDashes(lines.filter((line) => line !== null).join("\n").replace(/\n{3,}/g, "\n\n")),
  };
}

export function buildPaidPlanEmail(input: PaidEmailInput): { subject: string; body: string } {
  const firstName = input.firstName || "there";
  return {
    subject: paidPlanSubject(),
    body: stripEmDashes(
      [
        `Hey ${firstName},`,
        "",
        "Thanks! Here's the full Savings Plan I put together.",
        "",
        "It's attached.",
        "",
        `I'd start with the "Start Here" section. I pulled the biggest/easiest opportunities to the top so you don't have to dig through everything.`,
        "",
        "And same deal as I mentioned before: if you get into this and feel like it wasn't worth the $49, just reply and tell me. I'll refund it, no problem.",
        "",
        "Hope it saves you some money this winter!",
        "",
        "Ben",
      ].join("\n"),
    ),
  };
}

export function assertDraftCopySafe(options: {
  offerMode: OfferMode;
  body: string;
  checkoutUrl?: string | null;
}): string[] {
  const issues: string[] = [];
  const body = options.body.toLowerCase();

  if (options.offerMode === "SCAN_UPSELL") {
    if (options.checkoutUrl && !options.body.includes(options.checkoutUrl)) {
      issues.push("SCAN_UPSELL email is missing the checkout URL");
    }
  }

  if (options.offerMode === "FULL_PLAN_FREE") {
    if (/\$49/.test(options.body) || /stripe|checkout|buy\.stripe/i.test(options.body)) {
      issues.push("FULL_PLAN_FREE email contains purchase language");
    }
    if (/wasn't enough to sell|not enough to charge|couldn't find enough/i.test(options.body)) {
      issues.push("FULL_PLAN_FREE email frames the result around not selling");
    }
  }

  if (body.includes("our team") || body.includes("our system") || body.includes("we analyzed")) {
    issues.push("email uses corporate we/our-team language");
  }

  if (options.body.includes("\u2014")) {
    issues.push("email contains an em dash");
  }

  return issues;
}
