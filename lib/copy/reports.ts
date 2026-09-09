import { SAVINGS_PLAN_PRICE_LABEL } from "@/config/compelling-savings";
import type { OfferMode } from "@/lib/pipeline/status";
import { stripEmDashes } from "@/lib/copy/sanitize";
import type { ReportWriting } from "@/lib/copy/writing-schema";
import { approvedHeadlineSavingsLine } from "@/lib/copy/scan-amounts";
import {
  fallbackFindingCopy,
  fallbackScanMyTake,
  fallbackScanOpening,
  fallbackScanQuestions,
  highlightOpportunities,
} from "@/lib/copy/scan-findings";
import {
  summarizeDisplaySavings,
  type DisplaySavingsSummary,
} from "@/lib/research/display-savings";
import type { CanonicalResearch } from "@/lib/research/schema";
import type { ReportData } from "@/reports/schema";

export { fallbackFindingCopy, familyMountains, highlightOpportunities, joinList, shortMountainName } from "@/lib/copy/scan-findings";

export function withoutEmDashes(value: string): string {
  return stripEmDashes(value);
}

function fallbackScanCopy(options: {
  research: CanonicalResearch;
  display: DisplaySavingsSummary;
  offerMode: OfferMode;
  checkoutUrl?: string | null;
}): NonNullable<ReportData["freeScan"]> {
  const { research, display, offerMode, checkoutUrl } = options;
  const firstName = research.family.firstName;
  const findings = highlightOpportunities(display).map((item) => {
    const copy = fallbackFindingCopy(item, research);
    return {
      heading: withoutEmDashes(copy.heading),
      tier: item.tier.toLowerCase() as "jackpot" | "strong" | "useful" | "watch",
      explanation: withoutEmDashes(copy.explanation),
      savings: undefined,
    };
  });

  return {
    greeting: `Howdy ${firstName}!`,
    opening: withoutEmDashes(`Howdy ${firstName}!\n\n${fallbackScanOpening(research, display)}`),
    savingsLine: withoutEmDashes(approvedHeadlineSavingsLine(display)),
    findings,
    myTake: withoutEmDashes(fallbackScanMyTake(research, display)),
    unknownsHeading: "A couple things to check",
    importantUnknowns: fallbackScanQuestions(research, display).map(withoutEmDashes),
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
            headline: "Want the full Savings Plan?",
            body: "I already put together the full Savings Plan for your family, with the exact programs, prices, eligibility, deadlines, fine print, blackout dates, and direct links, plus the comparisons behind the numbers.\n\nIf you'd rather have the whole thing laid out and ready to use instead of doing the digging yourself, it's $49.\n\nIf you get it and don't feel it was worth $49, just reply and tell me. I'll refund you and you keep the Plan. No hoops or nonsense.",
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
