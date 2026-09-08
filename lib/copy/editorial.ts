import fs from "fs";
import path from "path";
import { zodTextFormat } from "openai/helpers/zod";
import { env } from "@/lib/env";
import { openaiClient } from "@/lib/openai/research";
import { collectWritingText, isPlanDetailTeaser, writingVoiceIssues } from "@/lib/copy/banned";
import {
  parseReportWriting,
  ReportWritingSchema,
  type ReportWriting,
} from "@/lib/copy/writing-schema";
import { stripEmDashes } from "@/lib/copy/sanitize";
import { shortMountainName } from "@/lib/copy/reports";
import type { OfferMode } from "@/lib/pipeline/status";
import {
  formatCustomerRange,
  summarizeDisplaySavings,
  type DisplaySavingsSummary,
} from "@/lib/research/display-savings";
import type { CanonicalResearch } from "@/lib/research/schema";
import { freeScanLeakFlags, researchToReportData } from "@/lib/research/to-report";

export function loadEditorialGuide(): string {
  return fs.readFileSync(path.join(process.cwd(), "prompts/editorial.md"), "utf8");
}

function formatCheckedDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function buildEditorialFactPacket(options: {
  research: CanonicalResearch;
  display: DisplaySavingsSummary;
  offerMode: OfferMode;
}): Record<string, unknown> {
  const { research, display, offerMode } = options;
  const kids = research.family.children
    .map((child) => `${child.age}${child.grade ? ` (${child.grade})` : ""}`)
    .join(", ");
  const headline =
    display.firmLow > 0 ? display.headlineSavings : (display.conditionalSavings ?? "$0");

  return {
    you: {
      firstName: research.family.firstName,
      adults: research.family.adults,
      kids,
      homeZip: research.family.homeZip,
      skiDays: research.family.annualDays,
      destinations: research.family.destinations,
      skiProfile: research.family.skiProfile,
    },
    offerMode,
    savings: {
      counted: formatCustomerRange(display.firmLow, display.firmHigh),
      possibleIfItWorksOut: display.conditionalSavings ?? null,
      headlineToUse: headline,
      note:
        display.firmLow > 0
          ? "These savings are counted."
          : "Do not present the possible range as money in the bank.",
    },
    startHereFacts: research.paidPlan.startHere.map((step) => ({
      number: step.number,
      title: step.title,
      description: step.description,
      sourceTitle: step.sourceTitle,
    })),
    knownSavings: (research.paidPlan.alreadyDoingRight.length
      ? research.paidPlan.alreadyDoingRight
      : research.existingKnownSavings
    ).map((item) => ({ title: item.title, fact: item.note })),
    opportunities: display.opportunities.map((item) => ({
      id: item.opportunity.id,
      officialName: item.opportunity.name,
      mountain: shortMountainName(item.opportunity.location),
      category: item.opportunity.category,
      displayTier: item.tier,
      countKind: item.kind,
      counted: item.firm,
      savingsRange: formatCustomerRange(item.opportunity.netSavingsLow, item.opportunity.netSavingsHigh),
      eligibility: item.opportunity.eligibility,
      deadline: item.opportunity.deadline,
      restrictions: item.opportunity.restrictions,
      officialPricesAndRules: item.facts,
      lockedAssumptions: item.assumptions,
      fitFacts: item.opportunity.familyFit,
      howItWorks: item.opportunity.howItWorks,
      actionFacts: item.opportunity.recommendedAction,
      scenarios: item.scenarios.map((scenario) => ({
        label: scenario.label,
        normalCost: scenario.baseline,
        withThisOption: scenario.optimized,
        saves: scenario.savings,
        assumption: scenario.assumption,
        buy: scenario.buy ?? [],
        comparedWith: scenario.comparedWith ?? [],
      })),
      sourceTitle: item.opportunity.sourceTitle,
      sourceChecked: formatCheckedDate(item.opportunity.sourceCheckedAt),
    })),
    watchlist: research.watchlist.map((item) => ({
      title: item.title,
      watching: item.whatWeAreWatching,
      trigger: item.trigger,
    })),
    scanFindingSeeds: display.opportunities
      .filter((item) => item.tier !== "WATCH")
      .slice(0, 2)
      .concat(
        display.opportunities.filter((item) =>
          /4pass|statewide|variety|multi-resort/i.test(`${item.opportunity.category} ${item.opportunity.name}`),
        ).slice(0, 1),
      )
      .slice(0, 3)
      .map((item) => ({
        mountain: shortMountainName(item.opportunity.location),
        category: item.opportunity.category,
        displayTier: item.tier,
        countKind: item.kind,
        savingsRange: formatCustomerRange(item.opportunity.netSavingsLow, item.opportunity.netSavingsHigh),
        scanHint:
          item.kind === "conditional"
            ? "Only if this season's home-mountain pass is not already taken care of."
            : item.kind === "optional"
              ? "Only if you actually want days at this extra mountain."
              : undefined,
      })),
    scanForbidden: [
      "exact program or product names",
      "exact prices, percents, or emails",
      "deadlines",
      "source URLs",
      "purchase instructions detailed enough to skip the Plan",
      "words like reduced-price, need-based, fall sale, Stark, 4Pass, blackout, register by",
    ],
    scanFindingRule:
      offerMode === "FULL_PLAN_FREE"
        ? "The full Plan is already being provided. Do not tease it. Do not say you are keeping details in the Plan. Describe what you found at Scan-safe level only."
        : "Findings may say the exact details are in the Plan. Do not name programs, prices, deadlines, or links.",
    scanClosingRule:
      offerMode === "FULL_PLAN_FREE"
        ? "Quiet close such as Hope this helps. Do not offer to put together a plan. Do not mention $49."
        : "Set closing to null. The template adds the $49 CTA.",
    dollarStringsToUseExactly: {
      counted: formatCustomerRange(display.firmLow, display.firmHigh),
      possible: display.conditionalSavings ?? null,
      headlineToUse: headline,
    },
  };
}

function sanitizeWriting(writing: ReportWriting): ReportWriting {
  const walk = (value: unknown): unknown => {
    if (typeof value === "string") {
      return stripEmDashes(value)
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\s{2,}/g, " ")
        .trim();
    }
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, walk(entry)]));
    }
    return value;
  };
  return parseReportWriting(walk(writing));
}

export function editorialQualityIssues(options: {
  writing: ReportWriting;
  research: CanonicalResearch;
  offerMode: OfferMode;
}): string[] {
  const issues: string[] = [];
  const blob = collectWritingText(options.writing);
  issues.push(...writingVoiceIssues(blob));

  const opportunityIds = new Set(options.research.opportunities.map((item) => item.id));
  const writtenIds = new Set(options.writing.plan.opportunities.map((item) => item.id));
  for (const opportunity of options.writing.plan.opportunities) {
    if (!opportunityIds.has(opportunity.id)) {
      issues.push(`writing references unknown opportunity ${opportunity.id}`);
    }
  }
  for (const id of opportunityIds) {
    if (!writtenIds.has(id)) issues.push(`missing writing for ${id}`);
  }
  const startHereNumbers = new Set(options.research.paidPlan.startHere.map((item) => item.number));
  const writtenStart = new Set(options.writing.plan.startHere.map((item) => item.number));
  for (const number of startHereNumbers) {
    if (!writtenStart.has(number)) issues.push(`missing start-here step ${number}`);
  }

  const scanText = collectWritingText(options.writing.scan);
  const scanLower = scanText.toLowerCase();
  for (const item of options.research.opportunities) {
    if (scanText.includes(item.name)) {
      issues.push(`Scan copy includes paid program name "${item.name}"`);
    }
    const mountain = shortMountainName(item.location);
    let rest = item.name;
    if (mountain) {
      rest = rest.replace(new RegExp(mountain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), " ");
    }
    rest = rest.replace(/-/g, " ").replace(/\s+/g, " ").trim();
    if (rest.length > 6 && scanLower.includes(rest.toLowerCase())) {
      issues.push(`Scan copy includes shortened program name "${rest}"`);
    }
  }
  if (/,([^\s\d])/.test(blob)) {
    issues.push("missing space after a comma");
  }
  const firstName = options.research.family.firstName;
  if (new RegExp(`\\b(hi|hey|howdy)\\s+${firstName}\\b`, "i").test(options.writing.email.opening)) {
    issues.push("email opening repeats the greeting");
  }
  if (/\bhttps?:\/\//i.test(scanText) || /\b[\w.-]+\.(com|org|net)\b/i.test(scanText)) {
    issues.push("Scan copy includes a URL or domain");
  }
  if (/@/.test(scanText)) issues.push("Scan copy includes an email");
  if (
    /\b(reduced[- ]price|need-based|fall sale|stark mountain|4pass|expertvoice|blackout dates?|register by)/i.test(
      scanText,
    )
  ) {
    issues.push("Scan copy includes paid program mechanics");
  }
  const findingsText = collectWritingText(options.writing.scan.findings);
  if (/\$\d/.test(findingsText) || /\$\d/.test(options.writing.scan.myTake)) {
    issues.push("Scan findings or My take include a dollar amount");
  }
  const display = summarizeDisplaySavings(options.research);
  const headline =
    display.firmLow > 0 ? display.headlineSavings : (display.conditionalSavings ?? display.headlineSavings);
  const compact = (value: string) => value.replace(/\s*to\s*/gi, "-").replace(/[^\d-]/g, "");
  if (headline && headline !== "$0" && !compact(options.writing.scan.savingsLine).includes(compact(headline))) {
    issues.push(`Scan savingsLine must use ${headline}`);
  }
  if (display.firmLow > 0 && /could save|if things line up|good news:/i.test(options.writing.scan.savingsLine)) {
    issues.push("counted savings are hedged as uncertain");
  }
  if (options.offerMode === "FULL_PLAN_FREE") {
    const closing = options.writing.scan.closing ?? "";
    if (/put together|step-by-step plan|\$49|full details/i.test(closing)) {
      issues.push("Scan closing sounds like an upsell");
    }
    if (/\$49/.test(scanText)) {
      issues.push("FULL_PLAN_FREE Scan copy includes $49 language");
    }
    if (isPlanDetailTeaser(scanText)) {
      issues.push("FULL_PLAN_FREE Scan copy teases Plan details");
    }
  }
  for (const item of display.opportunities) {
    const copy = options.writing.plan.opportunities.find((entry) => entry.id === item.opportunity.id);
    const deadline = item.opportunity.deadline ?? "";
    const monthDay = deadline.match(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/i,
    );
    if (copy && monthDay) {
      const kept = `${copy.timingNote ?? ""} ${copy.action ?? ""}`;
      if (!new RegExp(monthDay[0].replace(/\s+/g, "\\s+"), "i").test(kept)) {
        issues.push(`${item.opportunity.id} must keep the deadline ${monthDay[0]}`);
      }
    }
    const assumptionBlob = `${item.assumptions.join(" ")} ${item.facts.join(" ")}`;
    if (!/not an official/i.test(assumptionBlob)) continue;
    if (copy && !/estimat|not an official|not official/i.test(collectWritingText(copy))) {
      issues.push(`${item.opportunity.id} must keep the unofficial estimate`);
    }
  }
  for (const step of options.writing.plan.startHere) {
    if (/[,;:]\s*$/.test(step.description)) issues.push(`start-here step ${step.number} looks truncated`);
  }

  const preview = researchToReportData({
    research: options.research,
    reportId: "editorial-preview",
    offerMode: options.offerMode,
    writing: options.writing,
  });
  issues.push(...freeScanLeakFlags(preview));
  return [...new Set(issues)];
}

export async function writeReportCopy(options: {
  research: CanonicalResearch;
  offerMode: OfferMode;
}): Promise<ReportWriting> {
  const display = summarizeDisplaySavings(options.research);
  const packet = buildEditorialFactPacket({
    research: options.research,
    display,
    offerMode: options.offerMode,
  });
  const openai = openaiClient();
  const model = env.openaiEditorialModel();
  let lastIssues: string[] = [];

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await openai.responses.create({
      model,
      store: false,
      text: {
        format: zodTextFormat(ReportWritingSchema, "ski_family_editorial"),
      },
      instructions: loadEditorialGuide(),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Write the customer-facing Scan, Plan, and email copy from these locked facts.",
                "Do not add programs, prices, dates, or eligibility that are not in the packet.",
                lastIssues.length
                  ? `Fix these issues from the previous draft:\n- ${lastIssues.join("\n- ")}`
                  : "",
                JSON.stringify(packet, null, 2),
              ]
                .filter(Boolean)
                .join("\n\n"),
            },
          ],
        },
      ],
    });

    const text = response.output_text?.trim();
    if (!text) throw new Error("Editorial model returned no output");
    const writing = sanitizeWriting(parseReportWriting(JSON.parse(text)));
    const issues = editorialQualityIssues({
      writing,
      research: options.research,
      offerMode: options.offerMode,
    });
    if (issues.length === 0) return writing;
    lastIssues = issues;
    if (attempt === 2) {
      const error = new Error(`Editorial writing failed quality checks: ${issues.join("; ")}`);
      (error as Error & { writing?: ReportWriting }).writing = writing;
      throw error;
    }
  }

  throw new Error("Editorial writing failed");
}
