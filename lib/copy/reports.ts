import { SAVINGS_PLAN_PRICE_LABEL } from "@/config/compelling-savings";
import type { OfferMode } from "@/lib/pipeline/status";
import { stripEmDashes } from "@/lib/copy/sanitize";
import type { ReportWriting } from "@/lib/copy/writing-schema";
import { approvedHeadlineSavingsLine } from "@/lib/copy/scan-amounts";
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

export function familyMountains(research: CanonicalResearch): string[] {
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

export function joinList(items: string[]): string {
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

export function fallbackFindingCopy(
  item: DisplayOpportunity,
  offerMode: OfferMode,
): { heading: string; explanation: string } {
  const rawMountain = shortMountainName(item.opportunity.location);
  const mountain =
    rawMountain && !/\b(indy|ikon|epic pass|mountain collective)\b/i.test(rawMountain)
      ? rawMountain
      : null;
  const category = `${item.opportunity.category} ${item.opportunity.name}`;
  let heading: string;
  let base: string;
  if (/lesson/i.test(category)) {
    heading = mountain ? `A kids lesson window at ${mountain}` : "A kids lesson window";
    base = mountain
      ? `There's a time-sensitive lesson option at ${mountain} that fits the ages you listed.`
      : "There's a time-sensitive lesson option that fits the ages you listed.";
  } else if (/multi-resort|indy|statewide|4pass/i.test(category)) {
    heading = "More mountains only if you want them";
    base = "There's a way to add extra resorts if you're actually going to use those days.";
  } else if (/camp|kids ski|kids program|youth/i.test(category)) {
    heading = mountain ? `A kids program option at ${mountain}` : "A kids program option";
    base = mountain
      ? `There's a kids-program option at ${mountain} if those days are on the calendar.`
      : "There's a kids-program option if those days are on the calendar.";
  } else if (/off-mountain|off-slope|daycation|activit/i.test(category)) {
    heading = mountain ? `An off-slope option at ${mountain}` : "An off-slope option";
    base = "There's an add-on for days when you're there but not skiing.";
  } else if (/partner|exploration|included/i.test(category)) {
    heading = "Extra-mountain days already in the mix";
    base = "Your likely home-mountain setup may already include a few days elsewhere.";
  } else if (item.kind === "optional" && mountain) {
    heading = `${mountain} only if you actually want days there`;
    base = `There's a useful option tied to ${mountain}.`;
  } else {
    heading = mountain ? `A useful option at ${mountain}` : "A useful season option";
    base = mountain ? `There's a useful option tied to ${mountain}.` : "There's a useful option for the season you described.";
  }
  const explanation =
    offerMode === "SCAN_UPSELL" ? `${base} I'll keep the exact details in the full Plan.` : base;
  return { heading, explanation };
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
  const findings = highlightOpportunities(display).map((item) => {
    const copy = fallbackFindingCopy(item, offerMode);
    return {
      heading: withoutEmDashes(copy.heading),
      tier: item.tier.toLowerCase() as "jackpot" | "strong" | "useful" | "watch",
      explanation: withoutEmDashes(copy.explanation),
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
    savingsLine: withoutEmDashes(approvedHeadlineSavingsLine(display)),
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
    savingsLine: withoutEmDashes(approvedHeadlineSavingsLine(display)),
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
