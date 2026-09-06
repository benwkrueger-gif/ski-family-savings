import { SAVINGS_PLAN_PRICE_LABEL } from "@/config/compelling-savings";
import type { OfferMode } from "@/lib/pipeline/status";
import type { ReportData } from "@/reports/schema";
import type { CanonicalResearch } from "./schema";
import { formatSavingsRange } from "./schema";

function tierToReport(tier: CanonicalResearch["opportunities"][number]["tier"]): ReportData["opportunities"][number]["tier"] {
  return tier.toLowerCase() as ReportData["opportunities"][number]["tier"];
}

function confidenceLabel(value: string): string {
  const upper = value.toUpperCase();
  if (upper === "HIGH") return "High";
  if (upper === "MEDIUM") return "Medium";
  if (upper === "LOW") return "Low";
  return value;
}

function restrictionList(value: string | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/\n+|;\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function researchToReportData(options: {
  research: CanonicalResearch;
  reportId: string;
  generatedDate?: string;
  season?: string;
  offerMode: OfferMode;
  checkoutUrl?: string | null;
}): ReportData {
  const { research, reportId, offerMode, checkoutUrl } = options;
  const generatedDate =
    options.generatedDate ??
    new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const headlineSavings =
    research.summary.headlineSavings ||
    formatSavingsRange(research.summary.coreSavingsLow, research.summary.coreSavingsHigh);

  const freeScanCta =
    offerMode === "SCAN_UPSELL"
      ? {
          headline: research.freeScan.ctaHeadline,
          body: research.freeScan.ctaBody,
          bullets: [
            "exact programs",
            "why your family qualifies",
            "savings math",
            "deadlines + restrictions",
            "direct source links",
            "what I'd actually do",
          ],
          price: SAVINGS_PLAN_PRICE_LABEL,
          url: checkoutUrl || undefined,
          buttonLabel: "Unlock my Savings Plan →",
        }
      : undefined;

  const discovered = research.opportunities.filter((item) => item.tier !== "WATCH");

  return {
    report: {
      generatedDate,
      reportId,
      season: options.season,
    },
    family: {
      firstName: research.family.firstName,
      lastName: research.family.lastName ?? undefined,
      homeZip: research.family.homeZip ?? undefined,
      adults: research.family.adults ?? undefined,
      children: research.family.children.map((child) => ({
        age: child.age,
        grade: child.grade ?? undefined,
      })),
      skiProfile: research.family.skiProfile ?? undefined,
      annualDays: research.family.annualDays ?? undefined,
      destinations: research.family.destinations,
    },
    summary: {
      headlineSavings,
      headline: research.summary.headline,
      subhead: research.summary.subhead || research.paidPlan.overview,
      confidence: confidenceLabel(research.summary.confidence),
      jackpotCount: research.summary.jackpotCount,
      strongCount: research.summary.strongCount,
      usefulCount: research.summary.usefulCount,
      watchCount: research.summary.watchCount,
    },
    freeScan: {
      primaryOpportunityArea: research.freeScan.primaryOpportunityArea,
      secondaryOpportunityAreas: [],
    opportunityAreas: research.freeScan.opportunityAreas,
      biggestPotentialWin: research.freeScan.biggestPotentialWin ?? undefined,
      biggestPotentialWinLabel: research.freeScan.biggestPotentialWinLabel ?? undefined,
      summaryText: research.freeScan.summaryText,
      importantUnknowns: research.freeScan.importantUnknowns,
      unknownsIntro: research.freeScan.unknownsIntro ?? undefined,
      cta: freeScanCta,
    },
    savingsMap: research.scenarioGroups.map((group) => ({
      label: group.label,
      potential:
        group.savingsLow != null && group.savingsHigh != null
          ? formatSavingsRange(group.savingsLow, group.savingsHigh)
          : undefined,
      note: group.note,
      kind: group.kind === "watch" ? "watch" : "region",
    })),
    opportunities: discovered.map((item) => ({
      id: item.id,
      tier: tierToReport(item.tier),
      title: item.name,
      location: item.location ?? undefined,
      potentialSavings: formatSavingsRange(item.netSavingsLow, item.netSavingsHigh),
      confidence: confidenceLabel(item.verificationStatus === "VERIFIED" ? "HIGH" : item.verificationStatus),
      whyItMatters: item.whyItMatters,
      howItWorks: item.howItWorks,
      whyYouQualify: item.familyFit,
      recommendedAction: item.recommendedAction,
      deadline: item.deadline ?? undefined,
      restrictions: restrictionList(item.restrictions),
      math: {
        normalCost: item.baselineCost != null ? `$${Math.round(item.baselineCost).toLocaleString("en-US")}` : undefined,
        optimizedCost:
          item.opportunityCost != null ? `$${Math.round(item.opportunityCost).toLocaleString("en-US")}` : undefined,
        estimatedSavings: formatSavingsRange(item.netSavingsLow, item.netSavingsHigh),
      },
      source: {
        name: item.sourceTitle,
        url: item.sourceUrl || undefined,
      },
      sources: item.sourceUrl ? [{ name: item.sourceTitle, url: item.sourceUrl }] : [],
    })),
    strategy: {
      headline: "What I'd do",
      steps: research.paidPlan.startHere.map((step) => ({
        number: step.number,
        title: step.title,
        description: step.description,
        source:
          step.sourceUrl || step.sourceTitle
            ? { name: step.sourceTitle ?? undefined, url: step.sourceUrl ?? undefined }
            : undefined,
      })),
    },
    knownSavings: (research.paidPlan.alreadyDoingRight.length
      ? research.paidPlan.alreadyDoingRight
      : research.existingKnownSavings
    ).map((item) => ({
      title: item.title,
      note: item.note,
      source:
        item.sourceUrl || item.sourceTitle
          ? { name: item.sourceTitle ?? undefined, url: item.sourceUrl ?? undefined }
          : undefined,
    })),
    watch: research.watchlist.map((item) => ({
      title: item.title,
      whatWeAreWatching: item.whatWeAreWatching,
      whyItCouldMatter: item.whyItCouldMatter,
      expectedTiming: item.expectedTiming ?? undefined,
      trigger: item.trigger ?? undefined,
      source:
        item.sourceUrl || item.sourceTitle
          ? { name: item.sourceTitle ?? undefined, url: item.sourceUrl ?? undefined }
          : undefined,
    })),
    methodology: {
      noFakeWins: true,
      title: research.freeScan.methodologyTitle || "No fake wins",
      text: research.freeScan.methodologyText,
    },
    sources: discovered
      .filter((item) => item.sourceUrl)
      .map((item) => ({ name: item.sourceTitle, url: item.sourceUrl })),
    closingLine: research.paidPlan.closingLine || research.paidPlan.bottomLine,
    referralLine: research.paidPlan.referralLine ?? undefined,
    thankYou: {
      enabled: true,
      headline: research.paidPlan.thankYouHeadline,
      body: research.paidPlan.thankYouBody,
    },
  };
}

const LEAK_HINTS =
  /\b(ikon|epic pass|indy pass|mountain collective|kids ski free|promo code|discount code|blackout|deadline|http|www\.)\b/i;

export function freeScanLeakFlags(data: ReportData): string[] {
  const flags: string[] = [];
  const scan = data.freeScan;
  if (!scan) return ["missing freeScan"];

  const blobs = [
    scan.summaryText,
    scan.biggestPotentialWin,
    ...(scan.opportunityAreas ?? []).flatMap((area) => [area.label, area.teaser]),
    ...(scan.importantUnknowns ?? []),
  ]
    .filter(Boolean)
    .join("\n");

  if (LEAK_HINTS.test(blobs)) {
    flags.push("Free Scan copy may reveal a program name, deadline, or link.");
  }

  for (const opportunity of data.opportunities) {
    if (opportunity.title && blobs.includes(opportunity.title)) {
      flags.push(`Free Scan copy repeats paid opportunity title "${opportunity.title}".`);
    }
  }

  return flags;
}
