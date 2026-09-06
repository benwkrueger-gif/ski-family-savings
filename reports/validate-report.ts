import { ZodError } from "zod";
import { ReportDataSchema, type ReportData, type Source } from "./schema";

export class ReportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportValidationError";
  }
}

type IssueGroup = {
  subject: string;
  missing: string[];
};

function hasSourceUrl(source?: Source, sources: Source[] = []): boolean {
  if (source?.url?.trim()) return true;
  return sources.some((item) => Boolean(item.url?.trim()));
}

function lastNameOf(family: ReportData["family"]): string | undefined {
  const value = family.lastName?.trim() || family.familyName?.trim();
  return value || undefined;
}

function defaultReportId(data: ReportData): string {
  const who = [data.family.firstName, lastNameOf(data.family)]
    .filter(Boolean)
    .join("")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 12);
  const date = data.report.generatedDate.replace(/[^a-zA-Z0-9]/g, "").slice(-8);
  return `SFS-${who || "FAMILY"}${date ? `-${date}` : ""}`;
}

export function normalizeReport(data: ReportData): ReportData {
  const lastName = lastNameOf(data.family);
  return {
    ...data,
    report: {
      ...data.report,
      reportId: data.report.reportId?.trim() || defaultReportId(data),
    },
    family: {
      ...data.family,
      lastName,
    },
    opportunities: data.opportunities.map((opportunity, index) => ({
      ...opportunity,
      id: opportunity.id?.trim() || `opp-${String(index + 1).padStart(3, "0")}`,
    })),
  };
}

export function collectCompletenessIssues(data: ReportData): IssueGroup[] {
  const groups: IssueGroup[] = [];

  if (data.opportunities.length === 0) {
    groups.push({ subject: "Report", missing: ["opportunities"] });
  }

  for (const opportunity of data.opportunities) {
    const missing: string[] = [];
    if (opportunity.tier !== "watch" && !opportunity.recommendedAction?.trim()) {
      missing.push("recommendedAction");
    }
    if (!hasSourceUrl(opportunity.source, opportunity.sources)) {
      missing.push("source.url");
    }
    if (missing.length > 0) {
      groups.push({
        subject: `Opportunity "${opportunity.title}"`,
        missing,
      });
    }
  }

  for (const item of data.watch) {
    if (!hasSourceUrl(item.source)) {
      groups.push({
        subject: `Watch item "${item.title}"`,
        missing: ["source.url"],
      });
    }
  }

  for (const step of data.strategy?.steps ?? []) {
    if (!hasSourceUrl(step.source)) {
      groups.push({
        subject: `Action "${step.title}"`,
        missing: ["source.url"],
      });
    }
  }

  if (data.freeScan?.cta && !data.freeScan.cta.url?.trim()) {
    groups.push({
      subject: "Free Scan CTA",
      missing: ["url"],
    });
  }

  return groups;
}

function opportunityTitleFromInput(input: unknown, index: number): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const opportunities = (input as { opportunities?: unknown }).opportunities;
  if (!Array.isArray(opportunities)) return undefined;
  const item = opportunities[index];
  if (!item || typeof item !== "object") return undefined;
  const title = (item as { title?: unknown }).title;
  return typeof title === "string" && title.trim() ? title : undefined;
}

function zodSubject(issue: ZodError["issues"][number], input: unknown): string {
  const path = issue.path;
  if (path[0] === "opportunities" && typeof path[1] === "number") {
    const title = opportunityTitleFromInput(input, path[1]);
    return title ? `Opportunity "${title}"` : `Opportunity ${path[1] + 1}`;
  }
  if (path[0] === "watch" && typeof path[1] === "number") {
    return `Watch item ${path[1] + 1}`;
  }
  if (path[0] === "family") return "Family";
  if (path[0] === "report") return "Report";
  if (path[0] === "summary") return "Summary";
  if (path[0] === "freeScan") return "Free Scan";
  if (path.length === 0) return "Report";
  return path
    .filter((part) => typeof part === "string")
    .join(".") || "Report";
}

function zodField(issue: ZodError["issues"][number]): string {
  const last = issue.path[issue.path.length - 1];
  if (typeof last === "string") return last;
  if (issue.path.length === 0) return "value";
  return issue.path.join(".");
}

export function formatIssueGroups(groups: IssueGroup[]): string {
  return groups
    .map((group) => `${group.subject} is missing:\n${group.missing.map((field) => `- ${field}`).join("\n")}`)
    .join("\n\n");
}

export function formatZodError(error: ZodError, input: unknown): string {
  const grouped = new Map<string, string[]>();
  for (const issue of error.issues) {
    const subject = zodSubject(issue, input);
    const field = zodField(issue);
    const list = grouped.get(subject) ?? [];
    if (issue.code === "invalid_type" && issue.message.toLowerCase().includes("undefined")) {
      list.push(field);
    } else if (issue.code === "too_small" || issue.code === "invalid_type") {
      list.push(field);
    } else {
      list.push(`${field} (${issue.message})`);
    }
    grouped.set(subject, list);
  }

  return formatIssueGroups(
    [...grouped.entries()].map(([subject, missing]) => ({
      subject,
      missing: [...new Set(missing)],
    })),
  );
}

export function prepareReport(input: unknown): ReportData {
  const parsed = ReportDataSchema.safeParse(input);
  if (!parsed.success) {
    throw new ReportValidationError(formatZodError(parsed.error, input));
  }

  const data = normalizeReport(parsed.data);
  const issues = collectCompletenessIssues(data);
  if (issues.length > 0) {
    throw new ReportValidationError(formatIssueGroups(issues));
  }
  return data;
}

export function printValidationError(error: unknown): never {
  if (error instanceof ReportValidationError) {
    console.error(`ERROR:\n${error.message}`);
    process.exit(1);
  }
  if (error instanceof SyntaxError) {
    console.error(`ERROR:\nJSON is invalid:\n- ${error.message}`);
    process.exit(1);
  }
  console.error(error);
  process.exit(1);
}
