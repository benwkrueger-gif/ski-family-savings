import type { OfferMode } from "@/lib/pipeline/status";
import { buildPlanVoice, buildScanCopy, withoutEmDashes } from "@/lib/copy/reports";
import type { ReportWriting } from "@/lib/copy/writing-schema";
import {
  formatCustomerRange,
  summarizeDisplaySavings,
  type DisplayOpportunity,
} from "@/lib/research/display-savings";
import type { CanonicalResearch } from "@/lib/research/schema";
import type { ReportData } from "@/reports/schema";

function formatCheckedLabel(value: string | null | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `Details checked ${label}.`;
}

function kindLabel(kind: DisplayOpportunity["kind"]): string | undefined {
  if (kind === "conditional") return "Only if you still need this";
  if (kind === "optional") return "Only if you actually go";
  if (kind === "watch") return "Not counted yet";
  return undefined;
}

function writingForOpportunity(writing: ReportWriting | undefined, id: string) {
  return writing?.plan.opportunities.find((item) => item.id === id);
}

function namedNote(
  items: Array<{ title: string; note: string }> | undefined,
  title: string,
): string | undefined {
  if (!items?.length) return undefined;
  const exact = items.find((item) => item.title === title);
  if (exact) return exact.note;
  const lowered = title.toLowerCase();
  return items.find((item) => lowered.includes(item.title.toLowerCase()) || item.title.toLowerCase().includes(lowered))
    ?.note;
}

function toReportOpportunity(item: DisplayOpportunity, writing?: ReportWriting) {
  const opportunity = item.opportunity;
  const copy = writingForOpportunity(writing, opportunity.id);
  const pair =
    opportunity.baselineCost != null && opportunity.opportunityCost != null
      ? {
          normalCost: item.scenarios[0]?.baseline,
          optimizedCost: item.scenarios[0]?.optimized,
          estimatedSavings: item.scenarios[0]?.savings,
        }
      : undefined;

  return {
    id: opportunity.id,
    tier: item.tier.toLowerCase() as ReportData["opportunities"][number]["tier"],
    title: withoutEmDashes(opportunity.name),
    location: opportunity.location ? withoutEmDashes(opportunity.location.split(",")[0] ?? opportunity.location) : undefined,
    potentialSavings: formatCustomerRange(opportunity.netSavingsLow, opportunity.netSavingsHigh),
    countKind: item.kind,
    kindLabel: kindLabel(item.kind),
    found: copy?.found ? withoutEmDashes(copy.found) : undefined,
    saveNote: copy?.saveNote ? withoutEmDashes(copy.saveNote) : undefined,
    whyItMatters: copy?.found ? withoutEmDashes(copy.found) : undefined,
    recommendedAction: copy?.action ? withoutEmDashes(copy.action) : undefined,
    action: copy?.action ? withoutEmDashes(copy.action) : undefined,
    catchNote: copy?.catchNote ? withoutEmDashes(copy.catchNote) : undefined,
    deadline: copy?.timingNote
      ? withoutEmDashes(copy.timingNote)
      : opportunity.deadline
        ? withoutEmDashes(opportunity.deadline)
        : undefined,
    restrictions: [],
    facts: [],
    assumptions: [],
    scenarios: item.scenarios.map((scenario) => {
      const note = copy?.scenarioNotes.find(
        (entry) => entry.label.toLowerCase() === scenario.label.toLowerCase(),
      )?.note;
      return {
        label: withoutEmDashes(scenario.label),
        kind: scenario.kind,
        assumption: scenario.buy?.length
          ? scenario.assumption
            ? withoutEmDashes(scenario.assumption)
            : undefined
          : note || scenario.assumption
            ? withoutEmDashes(note || scenario.assumption || "")
            : undefined,
        baseline: scenario.baseline,
        optimized: scenario.optimized,
        savings: scenario.savings,
        buy: scenario.buy ?? [],
        comparedWith: scenario.comparedWith ?? [],
      };
    }),
    sourceCheckedLabel: formatCheckedLabel(opportunity.sourceCheckedAt),
    math: item.scenarios.length === 0 ? pair : undefined,
    source: {
      name: opportunity.sourceTitle,
      url: opportunity.sourceUrl || undefined,
    },
    sources: opportunity.sourceUrl ? [{ name: opportunity.sourceTitle, url: opportunity.sourceUrl }] : [],
  };
}

export function researchToReportData(options: {
  research: CanonicalResearch;
  reportId: string;
  generatedDate?: string;
  season?: string;
  offerMode: OfferMode;
  checkoutUrl?: string | null;
  writing?: ReportWriting;
}): ReportData {
  const { research, reportId, offerMode, checkoutUrl, writing } = options;
  // Customer-facing Scan/Plan prose comes from the editorial writing pass.
  // research.freeScan / paidPlan overview strings are research leftovers and are not rendered.
  const generatedDate =
    options.generatedDate ??
    new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  const display = summarizeDisplaySavings(research);
  const scan = buildScanCopy({ research, offerMode, checkoutUrl, display, writing });
  const planVoice = buildPlanVoice(research, display, writing);
  const reportOpportunities = display.opportunities.map((item) => toReportOpportunity(item, writing));
  const headlineKind = display.firmLow > 0 ? "firm" : "conditional";
  const headlineSavings =
    headlineKind === "firm" ? display.headlineSavings : (display.conditionalSavings ?? display.headlineSavings);

  const knownSource = research.paidPlan.alreadyDoingRight.length
    ? research.paidPlan.alreadyDoingRight
    : research.existingKnownSavings;

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
      headline: scan.savingsLine ?? `I found roughly ${headlineSavings} worth a look.`,
      subhead: scan.savingsCondition,
      jackpotCount: display.counts.jackpotCount,
      strongCount: display.counts.strongCount,
      usefulCount: display.counts.usefulCount,
      watchCount: display.counts.watchCount,
      headlineKind,
      conditionalSavings: display.conditionalSavings,
    },
    planVoice,
    freeScan: scan,
    savingsMap: [],
    opportunities: reportOpportunities,
    strategy: {
      headline: "Here's where I'd start",
      intro: writing?.plan.startHereIntro ? withoutEmDashes(writing.plan.startHereIntro) : undefined,
      steps: research.paidPlan.startHere.map((step) => {
        const copy = writing?.plan.startHere.find((item) => item.number === step.number);
        return {
          number: step.number,
          title: withoutEmDashes(copy?.title ?? step.title),
          description: withoutEmDashes(copy?.description ?? step.description),
          source:
            step.sourceUrl || step.sourceTitle
              ? { name: step.sourceTitle ?? undefined, url: step.sourceUrl ?? undefined }
              : undefined,
        };
      }),
    },
    knownSavings: knownSource.map((item) => ({
      title: withoutEmDashes(item.title),
      note: withoutEmDashes(namedNote(writing?.plan.knownSavings, item.title) ?? item.note),
      source:
        item.sourceUrl || item.sourceTitle
          ? { name: item.sourceTitle ?? undefined, url: item.sourceUrl ?? undefined }
          : undefined,
    })),
    watch: research.watchlist.map((item) => ({
      title: withoutEmDashes(item.title),
      whatWeAreWatching: withoutEmDashes(
        namedNote(writing?.plan.watch, item.title) ?? item.whatWeAreWatching,
      ),
      source:
        item.sourceUrl || item.sourceTitle
          ? { name: item.sourceTitle ?? undefined, url: item.sourceUrl ?? undefined }
          : undefined,
    })),
    watchIntro: writing?.plan.watchIntro ? withoutEmDashes(writing.plan.watchIntro) : undefined,
    methodology: undefined,
    sources: reportOpportunities
      .filter((item) => item.source?.url)
      .map((item) => ({ name: item.source?.name, url: item.source?.url })),
    closingLine: planVoice.bottomLine,
    referralLine: research.paidPlan.referralLine ? withoutEmDashes(research.paidPlan.referralLine) : undefined,
    thankYou: {
      enabled: true,
      headline: planVoice.thankYouHeadline,
      body: planVoice.thankYouBody,
    },
  };
}

const LEAK_HINTS =
  /\b(ikon|epic pass|indy(?:\s+pass)?|mountain collective|kids ski free|promo code|discount code|blackout dates?|https?:\/\/|www\.)\b/i;

export function freeScanLeakFlags(data: ReportData): string[] {
  const flags: string[] = [];
  const scan = data.freeScan;
  if (!scan) return ["missing freeScan"];

  const blobs = [
    scan.greeting,
    scan.opening,
    scan.savingsLine,
    scan.savingsCondition,
    scan.myTake,
    scan.closing,
    scan.summaryText,
    scan.biggestPotentialWin,
    scan.biggestPotentialWinLabel,
    ...(scan.findings ?? []).flatMap((finding) => [
      finding.heading,
      finding.explanation,
      finding.whyThisFamily,
      finding.condition,
      finding.savings,
    ]),
    ...(scan.opportunityAreas ?? []).flatMap((area) => [area.label, area.teaser]),
    ...(scan.importantUnknowns ?? []),
    scan.cta?.headline,
    scan.cta?.body,
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

  const uuid = data.report.reportId;
  if (uuid && /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(uuid)) {
    const customerFacing = [blobs, data.summary.headline, data.summary.subhead, data.planVoice?.opening, data.planVoice?.myTake]
      .filter(Boolean)
      .join("\n");
    if (customerFacing.includes(uuid)) {
      flags.push("Customer-facing copy includes an internal report UUID.");
    }
  }

  return flags;
}
