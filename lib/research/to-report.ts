import type { OfferMode } from "@/lib/pipeline/status";
import { buildPlanVoice, buildScanCopy, withoutEmDashes } from "@/lib/copy/reports";
import type { ReportWriting } from "@/lib/copy/writing-schema";
import {
  formatCustomerRange,
  summarizeDisplaySavings,
  type DisplayOpportunity,
} from "@/lib/research/display-savings";
import { expiredPriceFact } from "@/lib/research/expired-price";
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

function cleanResearchProse(value: string): string {
  return withoutEmDashes(value)
    .replace(/\bthe family\b/gi, "your family")
    .replace(/\bthe child\b/gi, "your child")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function deterministicOpportunityCopy(item: DisplayOpportunity): {
  found: string;
  saveNote: string;
  action: string;
  catchNote?: string;
} {
  const opportunity = item.opportunity;
  const range = formatCustomerRange(opportunity.netSavingsLow, opportunity.netSavingsHigh);
  const counted = item.firm
    ? `${range} is counted in the report total.`
    : opportunity.alreadyKnownByFamily
      ? `${range} is not counted as newly found savings.`
      : `${range} remains uncounted until the open questions are resolved.`;
  const expired = expiredPriceFact(
    `${opportunity.countReason} ${opportunity.calculation} ${opportunity.deadline ?? ""}`,
  );
  const expiredNote = expired
    ? ` The ${expired} price is expired or requires current-price confirmation.`
    : "";
  return {
    found: opportunity.alreadyKnownByFamily
      ? "This was already part of your plan, so it is included for comparison rather than counted as a new saving."
      : item.firm
        ? "This is verified and counted based on the details currently available."
        : "This may be useful, but it stays uncounted until the open questions are resolved.",
    saveNote: cleanResearchProse(`${counted} ${opportunity.countReason}${expiredNote}`),
    action: cleanResearchProse(
      opportunity.recommendedAction || "Confirm the current details before buying.",
    ),
    catchNote:
      item.firm || !opportunity.countReason
        ? undefined
        : cleanResearchProse(`Still unknown: ${opportunity.countReason}`),
  };
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
  const fallback = deterministicOpportunityCopy(item);
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
    found: withoutEmDashes(copy?.found ?? fallback.found),
    saveNote: withoutEmDashes(copy?.saveNote ?? fallback.saveNote),
    whyItMatters: withoutEmDashes(copy?.found ?? fallback.found),
    recommendedAction: withoutEmDashes(copy?.action ?? fallback.action),
    action: withoutEmDashes(copy?.action ?? fallback.action),
    catchNote: copy?.catchNote
      ? withoutEmDashes(copy.catchNote)
      : fallback.catchNote
        ? withoutEmDashes(fallback.catchNote)
        : undefined,
    deadline: copy?.timingNote
      ? withoutEmDashes(copy.timingNote)
      : opportunity.deadline
        ? withoutEmDashes(opportunity.deadline)
        : undefined,
    restrictions: [],
    facts: item.facts,
    assumptions: item.assumptions,
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
      headline: scan.savingsLine ?? `I found roughly ${headlineSavings} in counted savings.`,
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
  /\b(ikon|epic pass|indy(?:\s+pass)?|mountain collective|kids ski free|promo code|discount code|blackout dates?|passport|vouchers?|sales open|proof of grade|corporate (?:pricing|program|access|savings)|https?:\/\/|www\.)\b/i;

const SCAN_CALENDAR_DATE =
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s+\d{4})?\b/i;

export function freeScanLeakFlags(data: ReportData): string[] {
  const flags: string[] = [];
  const scan = data.freeScan;
  if (!scan) return ["missing freeScan"];

  const prose = [
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
  ]
    .filter(Boolean)
    .join("\n");
  const blobs = [prose, scan.cta?.headline, scan.cta?.body].filter(Boolean).join("\n");

  if (LEAK_HINTS.test(prose) || SCAN_CALENDAR_DATE.test(prose)) {
    flags.push("Free Scan copy may reveal a program name, deadline, or link.");
  }

  const approvedHeadline =
    data.summary.headlineKind === "firm"
      ? data.summary.headlineSavings
      : (data.summary.conditionalSavings ?? data.summary.headlineSavings);
  const allowedDollarAmounts = new Set(
    [approvedHeadline, scan.cta?.price].flatMap(
      (value) => value?.match(/\$\d+(?:,\d{3})*(?:\.\d{1,2})?/g) ?? [],
    ),
  );
  const dollarAmounts = blobs.match(/\$\d+(?:,\d{3})*(?:\.\d{1,2})?/g) ?? [];
  const forbiddenDollarAmounts = [
    ...new Set(dollarAmounts.filter((amount) => !allowedDollarAmounts.has(amount))),
  ];
  for (const amount of forbiddenDollarAmounts) {
    flags.push(`Free Scan copy includes unapproved paid-detail amount ${amount}.`);
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
