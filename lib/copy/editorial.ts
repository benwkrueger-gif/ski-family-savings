import fs from "fs";
import path from "path";
import { zodTextFormat } from "openai/helpers/zod";
import { env } from "@/lib/env";
import { openaiClient } from "@/lib/openai/research";
import { isPlanDetailTeaser, collectWritingText, writingVoiceIssues } from "@/lib/copy/banned";
import {
  parseReportWriting,
  ReportWritingSchema,
  type ReportWriting,
} from "@/lib/copy/writing-schema";
import { stripEmDashes } from "@/lib/copy/sanitize";
import { buildScanCopy, shortMountainName } from "@/lib/copy/reports";
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
      pricingWarning: expiredPriceFact(
        `${item.opportunity.countReason} ${item.opportunity.calculation} ${item.opportunity.deadline ?? ""}`,
      )
        ? "The saved price tier is expired. Do not present it as currently available. Tell the customer to confirm the current price, and keep its savings conditional or uncounted."
        : null,
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

export class EditorialTimeoutError extends Error {
  readonly stage = "WRITING" as const;
  constructor(message: string) {
    super(message);
    this.name = "EditorialTimeoutError";
  }
}

export const EDITORIAL_MAX_OUTPUT_TOKENS = 8_000;

export function remainingEditorialMs(timeoutMs: number, startedAt: number, now = Date.now()): number {
  return timeoutMs - (now - startedAt);
}

export function repairCopyPunctuation(text: string): string {
  return text
    .replace(/,([^\s\d])/g, ", $1")
    .replace(/\bthe family\b/gi, "your family")
    .replace(/\b(?:your|the) household\b/gi, "your family");
}

export function calendarDateFacts(text: string): string[] {
  return [
    ...text.matchAll(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s+\d{4})?/gi,
    ),
  ].map((match) => match[0]);
}

function hasCalendarFact(text: string, fact: string): boolean {
  const monthDay = fact.replace(/,\s+\d{4}$/, "");
  return new RegExp(monthDay.replace(/\s+/g, "\\s+"), "i").test(text);
}

export function repairEditorialWriting(
  writing: ReportWriting,
  research: CanonicalResearch,
  offerMode: OfferMode = "FULL_PLAN_FREE",
): ReportWriting {
  const sanitized = sanitizeWriting(writing);
  const fallbackScan = buildScanCopy({ research, offerMode });
  const fallbackFindings = fallbackScan.findings ?? [];
  const repairScanField = (text: string, fallback: string) =>
    scanPaidContentIssues(text, research).length > 0 ? fallback : text;
  return parseReportWriting({
    ...sanitized,
    scan: {
      ...sanitized.scan,
      opening: repairScanField(
        sanitized.scan.opening,
        "Thanks for letting me look at your winter. I found a couple things worth checking for your home-mountain season.",
      ),
      findings: sanitized.scan.findings.map((finding, index) => ({
        heading: repairScanField(
          finding.heading,
          fallbackFindings[index]?.heading ?? "Something worth a look",
        ),
        explanation: repairScanField(
          finding.explanation,
          fallbackFindings[index]?.explanation ?? "There's a useful option worth checking.",
        ),
      })),
      myTake: repairScanField(
        sanitized.scan.myTake,
        fallbackScan.myTake ??
          "I'd start with the verified child-access option, then confirm current home-mountain pricing.",
      ),
      questions: sanitized.scan.questions.filter(
        (question) => scanPaidContentIssues(question, research).length === 0,
      ),
    },
    plan: {
      ...sanitized.plan,
      startHere: sanitized.plan.startHere.map((step) => {
        const source = research.paidPlan.startHere.find((item) => item.number === step.number);
        const requiredDates = calendarDateFacts(source?.description ?? "");
        return requiredDates.some((fact) => !hasCalendarFact(step.description, fact)) && source
          ? { ...step, description: repairCopyPunctuation(source.description) }
          : step;
      }),
      opportunities: sanitized.plan.opportunities.map((copy) => {
        const source = research.opportunities.find((item) => item.id === copy.id);
        const requiredDates = calendarDateFacts(source?.deadline ?? "");
        const kept = `${copy.timingNote ?? ""} ${copy.action}`;
        return requiredDates.some((fact) => !hasCalendarFact(kept, fact)) && source?.deadline
          ? { ...copy, timingNote: repairCopyPunctuation(source.deadline) }
          : copy;
      }),
    },
  });
}

export function scanDollarIssues(options: {
  scanText: string;
  approvedSavings: string[];
  allowPlanPrice?: boolean;
}): string[] {
  const allowed = new Set(
    options.approvedSavings.flatMap(
      (value) => value.match(/\$\d+(?:,\d{3})*(?:\.\d{1,2})?/g) ?? [],
    ),
  );
  if (options.allowPlanPrice) allowed.add("$49");
  const used = options.scanText.match(/\$\d+(?:,\d{3})*(?:\.\d{1,2})?/g) ?? [];
  const forbidden = [...new Set(used.filter((amount) => !allowed.has(amount)))];
  return forbidden.map((amount) => `Scan copy includes unapproved paid-detail amount ${amount}`);
}

const SCAN_PAID_MECHANICS =
  /\b(passport|vouchers?|blackout|register(?:ed| by)?|sales open|purchase|proof of (?:grade|age)|fifth grade (?:offer|benefit|option|program)|qualif(?:y|ies|ied)|corporate (?:pricing|program|access|savings)|employers?|human resources|\bHR\b|book(?:ed|ing)? .{0,20}(?:ahead|advance)|adult .{0,20}valid access)\b/i;

export function scanPaidContentIssues(
  text: string,
  research: CanonicalResearch,
): string[] {
  const issues: string[] = [];
  if (calendarDateFacts(text).length > 0) issues.push("Scan copy includes a deadline");
  if (/\bhttps?:\/\//i.test(text) || /@/.test(text)) issues.push("Scan copy includes a link or email");
  if (SCAN_PAID_MECHANICS.test(text)) issues.push("Scan copy includes paid program mechanics");
  const lower = text.toLowerCase();
  for (const item of research.opportunities) {
    if (lower.includes(item.name.toLowerCase())) {
      issues.push(`Scan copy includes paid program name "${item.name}"`);
    }
  }
  return [...new Set(issues)];
}

export function expiredPriceFact(
  text: string,
  now = new Date(),
): string | null {
  const match = text.match(
    /(?:valid(?:\s+only)?\s+through|purchase\s+by)\s+(September|October|November|December|January|February|March|April|May|June|July|August)\s+(\d{1,2})(?:,?\s+(\d{4}))?/i,
  );
  if (!match) return null;
  const year = Number(match[3] ?? now.getUTCFullYear());
  const expires = new Date(`${match[1]} ${match[2]}, ${year} 23:59:59 UTC`);
  if (Number.isNaN(expires.getTime()) || now.getTime() <= expires.getTime()) return null;
  return `${match[1]} ${match[2]}, ${year}`;
}

function acknowledgesExpiredPrice(text: string): boolean {
  return /\b(expired|past|no longer current|current .{0,30}(?:price|prices|pricing|rate|rates)|today'?s .{0,30}(?:price|prices|pricing|rate|rates)|confirm .{0,30}(?:price|prices|pricing|rate|rates)|call .{0,40}(?:price|prices|pricing|rate|rates)|not counted)\b/i.test(
    text,
  );
}

function dropTeaserSentences(text: string): string {
  const kept = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !isPlanDetailTeaser(sentence));
  return kept.join(" ").replace(/\s{2,}/g, " ").trim();
}

export function adaptWritingForOfferMode(writing: ReportWriting, offerMode: OfferMode): ReportWriting {
  if (offerMode !== "FULL_PLAN_FREE") return writing;
  const closingSource = writing.scan.closing ?? "";
  const strippedClosing = dropTeaserSentences(closingSource);
  const closing =
    !strippedClosing || /put together|step-by-step plan|\$49|full details/i.test(strippedClosing)
      ? "Hope this helps."
      : strippedClosing;
  return parseReportWriting({
    ...writing,
    scan: {
      ...writing.scan,
      opening: dropTeaserSentences(writing.scan.opening) || writing.scan.opening,
      myTake: dropTeaserSentences(writing.scan.myTake) || writing.scan.myTake,
      findings: writing.scan.findings.map((finding) => ({
        ...finding,
        explanation: dropTeaserSentences(finding.explanation) || finding.explanation,
      })),
      closing,
    },
  });
}

export function reuseSavedWriting(options: {
  stored: unknown;
  research: CanonicalResearch;
  offerMode: OfferMode;
}): ReportWriting | null {
  if (options.stored == null) return null;
  try {
    const parsed = repairEditorialWriting(
      parseReportWriting(options.stored),
      options.research,
      options.offerMode,
    );
    const adapted = adaptWritingForOfferMode(parsed, options.offerMode);
    const issues = editorialQualityIssues({
      writing: adapted,
      research: options.research,
      offerMode: options.offerMode,
    });
    return issues.length === 0 ? adapted : null;
  } catch {
    return null;
  }
}

function sanitizeWriting(writing: ReportWriting): ReportWriting {
  const walk = (value: unknown): unknown => {
    if (typeof value === "string") {
      return repairCopyPunctuation(stripEmDashes(value))
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
  issues.push(...scanPaidContentIssues(scanText, options.research));
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
  const display = summarizeDisplaySavings(options.research);
  const headline =
    display.firmLow > 0 ? display.headlineSavings : (display.conditionalSavings ?? display.headlineSavings);
  issues.push(
    ...scanDollarIssues({
      scanText,
      approvedSavings: [
        display.headlineSavings,
        display.conditionalSavings ?? "",
      ],
      allowPlanPrice: options.offerMode === "SCAN_UPSELL",
    }),
  );
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
    const deadlineFacts = calendarDateFacts(item.opportunity.deadline ?? "");
    if (copy && deadlineFacts.length > 0) {
      const checkedAt = new Date(`${item.opportunity.sourceCheckedAt}T12:00:00`);
      const sourceCheckedDay = Number.isNaN(checkedAt.getTime())
        ? ""
        : checkedAt.toLocaleDateString("en-US", { month: "long", day: "numeric" });
      const kept = `${copy.timingNote ?? ""} ${copy.action ?? ""}`;
      for (const fact of deadlineFacts) {
        const isSourceCheckedDate = sourceCheckedDay.toLowerCase() === fact.replace(/,\s+\d{4}$/, "").toLowerCase();
        if (item.tier === "WATCH" || isSourceCheckedDate) continue;
        if (!hasCalendarFact(kept, fact)) {
          issues.push(`${item.opportunity.id} must keep mandatory deadline "${fact}"`);
        }
      }
    }
    const expired = expiredPriceFact(
      `${item.opportunity.countReason} ${item.opportunity.calculation} ${item.opportunity.deadline ?? ""}`,
    );
    if (copy && expired && !acknowledgesExpiredPrice(collectWritingText(copy))) {
      issues.push(
        `${item.opportunity.id} must say the ${expired} price is expired or requires current-price confirmation`,
      );
    }
    const assumptionBlob = `${item.assumptions.join(" ")} ${item.facts.join(" ")}`;
    if (!/not an official/i.test(assumptionBlob)) continue;
    if (copy && !/estimat|not an official|not official/i.test(collectWritingText(copy))) {
      issues.push(`${item.opportunity.id} must keep the unofficial estimate`);
    }
  }
  for (const step of options.writing.plan.startHere) {
    if (/[,;:]\s*$/.test(step.description)) issues.push(`start-here step ${step.number} looks truncated`);
    const source = options.research.paidPlan.startHere.find((item) => item.number === step.number);
    for (const fact of calendarDateFacts(source?.description ?? "")) {
      if (!hasCalendarFact(step.description, fact)) {
        issues.push(`start-here step ${step.number} must keep mandatory date "${fact}"`);
      }
    }
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

function isEditorialTimeout(error: unknown): boolean {
  if (error instanceof EditorialTimeoutError) return true;
  const name = typeof error === "object" && error && "name" in error ? String(error.name) : "";
  const message = error instanceof Error ? error.message : String(error);
  return (
    name === "APIUserAbortError" ||
    name === "AbortError" ||
    name === "APIConnectionTimeoutError" ||
    /timed out|timeout/i.test(message)
  );
}

export async function writeReportCopy(options: {
  research: CanonicalResearch;
  offerMode: OfferMode;
  timeoutMs?: number;
}): Promise<ReportWriting> {
  const display = summarizeDisplaySavings(options.research);
  const packet = buildEditorialFactPacket({
    research: options.research,
    display,
    offerMode: options.offerMode,
  });
  const openai = openaiClient();
  const model = env.openaiEditorialModel();
  const timeoutMs = options.timeoutMs ?? env.openaiEditorialTimeoutMs();
  const startedAt = Date.now();
  const remaining = remainingEditorialMs(timeoutMs, startedAt);
  if (remaining <= 0) {
    throw new EditorialTimeoutError(
      `Editorial timed out after ${Date.now() - startedAt}ms (budget ${timeoutMs}ms)`,
    );
  }
  let response;
  try {
    response = await openai.responses.create(
        {
          model,
          store: false,
          max_output_tokens: EDITORIAL_MAX_OUTPUT_TOKENS,
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
                    "Do not use web search. Rewrite only the locked fact packet.",
                    JSON.stringify(packet),
                  ]
                    .filter(Boolean)
                    .join("\n\n"),
                },
              ],
            },
          ],
        },
        { timeout: remaining, maxRetries: 0 },
    );
  } catch (error) {
    if (isEditorialTimeout(error)) {
      throw new EditorialTimeoutError(
        `Editorial OpenAI call timed out after ${Date.now() - startedAt}ms (budget ${timeoutMs}ms)`,
      );
    }
    throw error;
  }

  const text = response.output_text?.trim();
  if (!text) throw new Error("Editorial model returned no output");
  const writing = repairEditorialWriting(
    parseReportWriting(JSON.parse(text)),
    options.research,
    options.offerMode,
  );
  const issues = editorialQualityIssues({
    writing,
    research: options.research,
    offerMode: options.offerMode,
  });
  if (issues.length === 0) return writing;
  const error = new Error(`Editorial writing failed quality checks: ${issues.join("; ")}`);
  (error as Error & { writing?: ReportWriting }).writing = writing;
  throw error;
}
