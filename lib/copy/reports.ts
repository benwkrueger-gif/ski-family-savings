import { SAVINGS_PLAN_PRICE_LABEL } from "@/config/compelling-savings";
import type { OfferMode } from "@/lib/pipeline/status";
import { stripEmDashes } from "@/lib/copy/sanitize";
import type { ReportWriting } from "@/lib/copy/writing-schema";
import {
  summarizeDisplaySavings,
  type DisplayOpportunity,
  type DisplaySavingsSummary,
} from "@/lib/research/display-savings";
import type { CanonicalResearch } from "@/lib/research/schema";
import type { ReportData } from "@/reports/schema";

const TIER_RANK: Record<DisplayOpportunity["tier"], number> = {
  JACKPOT: 0,
  STRONG: 1,
  USEFUL: 2,
  WATCH: 3,
};

export function withoutEmDashes(value: string): string {
  return stripEmDashes(value);
}

export function shortMountainName(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const primary = value.split(",")[0]?.trim() ?? "";
  const cleaned = primary
    .replace(/\s+(considering|not yet named|possibly).*$/i, "")
    .replace(/\s+Ski Area$/i, "")
    .trim();
  if (!cleaned) return null;
  if (/^(vermont|new hampshire|maine|massachusetts|new york|connecticut)$/i.test(cleaned)) return null;
  if (/few other|not yet named|variety|participating|online member/i.test(cleaned)) return null;
  return cleaned;
}

function kidsPhrase(research: CanonicalResearch): string {
  const kids = research.family.children;
  if (kids.length === 0) return "";
  const one = (age: number) => {
    const article = /^(8|11|18)/.test(String(age)) ? "an" : "a";
    return `${article} ${age}-year-old`;
  };
  if (kids.length === 1) return one(kids[0].age);
  if (kids.length === 2) return `${one(kids[0].age)} and ${one(kids[1].age)}`;
  return `${kids.length} kids`;
}

function familyMountains(research: CanonicalResearch): string[] {
  const names = research.family.destinations
    .map((item) => shortMountainName(item))
    .filter((item): item is string => Boolean(item));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.slice(-1)[0]}`;
}

export function highlightOpportunities(display: DisplaySavingsSummary): DisplayOpportunity[] {
  const main = display.opportunities
    .filter((item) => item.tier !== "WATCH")
    .sort((a, b) => {
      const home = (item: DisplayOpportunity) =>
        /home-mountain/i.test(item.opportunity.category) ? 0 : 1;
      return (
        home(a) - home(b) ||
        TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
        b.opportunity.netSavingsHigh - a.opportunity.netSavingsHigh
      );
    });
  const extraWatch = display.opportunities.find(
    (item) =>
      item.tier === "WATCH" &&
      /4pass|statewide|variety|multi-resort/i.test(
        `${item.opportunity.category} ${item.opportunity.name}`,
      ),
  );
  const picked = [...main];
  if (extraWatch && picked.length < 3) picked.push(extraWatch);
  return picked.slice(0, 3);
}

function fallbackScanCopy(options: {
  research: CanonicalResearch;
  display: DisplaySavingsSummary;
  offerMode: OfferMode;
  checkoutUrl?: string | null;
}): NonNullable<ReportData["freeScan"]> {
  const { research, display, offerMode, checkoutUrl } = options;
  const firstName = research.family.firstName;
  const kids = kidsPhrase(research);
  const mountains = familyMountains(research).slice(0, 3);
  const range =
    display.firmLow > 0 ? display.headlineSavings : (display.conditionalSavings ?? display.headlineSavings);
  const findings = highlightOpportunities(display).map((item) => {
    const mountain = shortMountainName(item.opportunity.location);
    const heading = mountain
      ? item.kind === "optional"
        ? `${mountain} only if you actually want days there`
        : `Something worth a look at ${mountain}`
      : "Something worth a look";
    const base = mountain
      ? `There's a useful option tied to ${mountain}.`
      : "There's a useful option here.";
    const explanation =
      offerMode === "SCAN_UPSELL" ? `${base} I'll keep the exact details in the full Plan.` : base;
    return {
      heading: withoutEmDashes(heading),
      tier: item.tier.toLowerCase() as "jackpot" | "strong" | "useful" | "watch",
      explanation: withoutEmDashes(explanation),
      savings: undefined,
    };
  });

  const picture = [
    kids ? `You've got ${kids}` : null,
    mountains.length ? `and a season around ${joinList(mountains)}` : null,
    research.family.annualDays ? `about ${research.family.annualDays} on snow` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    greeting: `Howdy ${firstName}!`,
    opening: withoutEmDashes(
      `Howdy ${firstName}!\n\nThanks for letting me look at your winter.${picture ? ` ${picture}.` : ""}\n\nHere's what I'd pay attention to.`,
    ),
    savingsLine: withoutEmDashes(
      display.firmLow > 0
        ? `I found roughly ${range} that looks worth a look.`
        : `I couldn't lock in a sure number yet. If a couple things still go your way, it could be about ${range}.`,
    ),
    findings,
    myTake: withoutEmDashes(
      "If I were in your shoes, I'd start with the home-mountain question, then decide whether the extra mountain is actually on the calendar.",
    ),
    unknownsHeading: "A couple things to check",
    importantUnknowns: [],
    closing:
      offerMode === "FULL_PLAN_FREE"
        ? "Hope this helps. If you want me to look at something else, just reply.\n\nBen"
        : undefined,
    preparedFor: firstName,
    opportunityAreas: [],
    secondaryOpportunityAreas: [],
    biggestPotentialWin: findings[0]?.savings,
    biggestPotentialWinLabel: findings[0]?.heading,
    cta:
      offerMode === "SCAN_UPSELL"
        ? {
            headline: "Want the full details?",
            body: "I already put together the complete Savings Plan with the exact programs, who qualifies, deadlines, and links. If you'd like it, it's $49.\n\nIf you get it and don't feel it was worth $49, tell me. I'll refund you. You can keep the Plan.",
            bullets: [],
            price: SAVINGS_PLAN_PRICE_LABEL,
            url: checkoutUrl || undefined,
            buttonLabel: "Get the Savings Plan",
          }
        : undefined,
  };
}

export function buildScanCopy(options: {
  research: CanonicalResearch;
  offerMode: OfferMode;
  checkoutUrl?: string | null;
  display?: DisplaySavingsSummary;
  writing?: ReportWriting;
}): NonNullable<ReportData["freeScan"]> {
  const display = options.display ?? summarizeDisplaySavings(options.research);
  const fallback = fallbackScanCopy({
    research: options.research,
    display,
    offerMode: options.offerMode,
    checkoutUrl: options.checkoutUrl,
  });
  const writing = options.writing;
  if (!writing) return fallback;

  const highlighted = highlightOpportunities(display);
  const findings = writing.scan.findings.map((finding, index) => {
    const item = highlighted[index];
    return {
      heading: withoutEmDashes(finding.heading),
      tier: (item?.tier.toLowerCase() ?? "watch") as "jackpot" | "strong" | "useful" | "watch",
      explanation: withoutEmDashes(finding.explanation),
      savings: undefined,
    };
  });

  return {
    ...fallback,
    greeting: withoutEmDashes(writing.scan.greeting),
    opening: withoutEmDashes(`${writing.scan.greeting}\n\n${writing.scan.opening}`),
    savingsLine: withoutEmDashes(writing.scan.savingsLine),
    savingsCondition: undefined,
    findings,
    myTake: withoutEmDashes(writing.scan.myTake),
    unknownsHeading: "A couple things to check",
    importantUnknowns: writing.scan.questions.map(withoutEmDashes),
    closing:
      options.offerMode === "FULL_PLAN_FREE"
        ? withoutEmDashes(writing.scan.closing || "Hope this helps.\n\nBen")
        : undefined,
    biggestPotentialWin: findings[0]?.savings,
    biggestPotentialWinLabel: findings[0]?.heading,
  };
}

export function buildPlanVoice(
  research: CanonicalResearch,
  display?: DisplaySavingsSummary,
  writing?: ReportWriting,
): {
  opening: string;
  myTake: string;
  bottomLine: string;
  thankYouHeadline: string;
  thankYouBody: string;
} {
  if (writing) {
    return {
      opening: withoutEmDashes(writing.plan.opening),
      myTake: withoutEmDashes(writing.plan.myTake),
      bottomLine: withoutEmDashes(writing.plan.bottomLine),
      thankYouHeadline: withoutEmDashes(`Hope this helps, ${research.family.firstName}.`),
      thankYouBody: withoutEmDashes(writing.plan.thankYou),
    };
  }
  const resolved = display ?? summarizeDisplaySavings(research);
  const scan = fallbackScanCopy({
    research,
    display: resolved,
    offerMode: "FULL_PLAN_FREE",
  });
  return {
    opening: withoutEmDashes(
      `Howdy ${research.family.firstName}. Here's where I'd start with the season you described.`,
    ),
    myTake: scan.myTake ?? "",
    bottomLine: withoutEmDashes("Start with the home-mountain question, then decide on extra days."),
    thankYouHeadline: withoutEmDashes(`Hope this helps, ${research.family.firstName}.`),
    thankYouBody: withoutEmDashes("If something looks off or you want me to look at another mountain, just reply."),
  };
}
