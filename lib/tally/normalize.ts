import type { FamilyProfile, NormalizedChild } from "@/lib/family/profile";
import { familySummaryLine } from "@/lib/family/profile";
import { fieldsFromStoredRawTally, type NormalizedTallyField } from "./payload";

/**
 * Optional exact Tally question IDs. Prefer these over label matching when present.
 * Add IDs here after the first real webhook if label matching needs tightening.
 */
export const TALLY_QUESTION_IDS: Partial<Record<keyof Omit<FamilyProfile, "internalId" | "tallySubmissionId" | "children">, string[]>> = {
  firstName: [],
  email: [],
  homeZip: [],
  adultsCount: [],
  skiingStyle: [],
  typicalSkiDays: [],
  weekdayFlexibility: [],
  expectedSpend: [],
  alreadyKnownSavings: [],
  additionalNotes: [],
};

const LABEL_MATCHERS: Array<{
  field: keyof typeof TALLY_QUESTION_IDS;
  tests: RegExp[];
}> = [
  { field: "firstName", tests: [/\bfirst name\b/i, /^name$/i, /\byour name\b/i] },
  { field: "email", tests: [/\bemail\b/i] },
  { field: "homeZip", tests: [/\bzip\b/i, /\bpostal\b/i] },
  { field: "adultsCount", tests: [/\badults?\b/i] },
  { field: "skiingStyle", tests: [/\bski(ing)? style\b/i, /\bhow you ski\b/i, /\bski profile\b/i] },
  { field: "typicalSkiDays", tests: [/\bski days\b/i, /\bhow many days\b/i, /\bdays (a|per|this) season\b/i] },
  { field: "weekdayFlexibility", tests: [/\bweekdays?\b/i, /\bmidweek\b/i, /\bflexib/i] },
  { field: "expectedSpend", tests: [/\bspend\b/i, /\bbudget\b/i] },
  { field: "alreadyKnownSavings", tests: [/\balready know about\b/i, /\bdeals? do you already\b/i, /\bprograms or deals\b/i] },
  { field: "additionalNotes", tests: [/\banything else\b/i, /\bnotes?\b/i, /\bother\b/i, /\bcomments?\b/i] },
];

function stringifyValue(field: NormalizedTallyField | undefined): string | null {
  if (!field) return null;
  const value = resolveChoice(field);
  if (value == null || value === "") return null;
  if (Array.isArray(value)) {
    const parts = value.map((item) => stringifyUnknown(item)).filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }
  if (typeof value === "object") return stringifyUnknown(value);
  return String(value).trim() || null;
}

function stringifyUnknown(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(stringifyUnknown).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.text ?? record.label ?? record.name ?? record.url ?? JSON.stringify(value));
  }
  return "";
}

function resolveChoice(field: NormalizedTallyField): unknown {
  const value = field.value;
  if (!field.options?.length) return value;
  const ids = Array.isArray(value) ? value : value != null ? [value] : [];
  const texts = ids
    .map((id) => field.options?.find((option) => option.id === id || option.text === id)?.text ?? String(id))
    .filter(Boolean);
  return texts.length ? texts : value;
}

function listValue(field: NormalizedTallyField | undefined): string[] {
  if (!field) return [];
  const resolved = resolveChoice(field);
  if (resolved == null || resolved === "") return [];
  if (Array.isArray(resolved)) {
    return resolved.map(stringifyUnknown).map((item) => item.trim()).filter(Boolean);
  }
  return String(stringifyUnknown(resolved))
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function numberValue(field: NormalizedTallyField | undefined): number | null {
  if (!field) return null;
  const raw = stringifyValue(field);
  if (!raw) return null;
  const match = raw.match(/\d+/);
  if (!match) return null;
  return Number.parseInt(match[0], 10);
}

function findField(
  fields: NormalizedTallyField[],
  key: keyof typeof TALLY_QUESTION_IDS,
): NormalizedTallyField | undefined {
  const ids = TALLY_QUESTION_IDS[key] ?? [];
  const byId = fields.find((field) => ids.includes(field.id));
  if (byId) return byId;
  const matcher = LABEL_MATCHERS.find((item) => item.field === key);
  if (!matcher) return undefined;
  return fields.find((field) => matcher.tests.some((test) => test.test(field.label)));
}

function findFields(fields: NormalizedTallyField[], tests: RegExp[]): NormalizedTallyField[] {
  return fields.filter((field) => tests.some((test) => test.test(field.label)));
}

function parseChildren(fields: NormalizedTallyField[]): NormalizedChild[] {
  const children: NormalizedChild[] = [];
  const ageFields = findFields(fields, [/\b(child|kid).*(age)\b/i, /\bage.*(child|kid)\b/i, /\bages?\b/i]);
  const gradeFields = findFields(fields, [/\b(child|kid).*(grade)\b/i, /\bgrade.*(child|kid)\b/i, /\bgrades?\b/i]);

  const max = Math.max(ageFields.length, gradeFields.length);
  if (max === 0) {
    const kidsCount = numberValue(findFields(fields, [/\bhow many (kids|children)\b/i, /\bchildren\b/i, /\bkids\b/i])[0]);
    if (kidsCount && kidsCount > 0) {
      return Array.from({ length: Math.min(kidsCount, 8) }, () => ({ age: null, grade: null }));
    }
    return [];
  }

  for (let i = 0; i < max; i += 1) {
    children.push({
      age: numberValue(ageFields[i]),
      grade: stringifyValue(gradeFields[i]),
    });
  }
  return children.filter((child) => child.age != null || Boolean(child.grade));
}

export function normalizeTallyAnswers(options: {
  internalId: string;
  tallySubmissionId: string;
  fields: NormalizedTallyField[];
}): FamilyProfile {
  const { fields } = options;
  const firstName = stringifyValue(findField(fields, "firstName")) || "there";
  const email = stringifyValue(findField(fields, "email")) || "";

  const destinations = listValue(
    findFields(fields, [/\bdestination/i, /\bmountains?\b/i, /\bresorts?\b/i, /\bwhere (do you|will you) ski\b/i])[0],
  );
  const passes = listValue(
    findFields(fields, [/\bpass/i, /\bmembership/i, /\bikon\b/i, /\bepic\b/i, /\bindy\b/i])[0],
  );
  const categories = listValue(
    findFields(fields, [/\bcategor/i, /\bwhat should i (look|search)/i, /\bareas to (search|look)/i])[0],
  );
  const affiliationFields = findFields(fields, [
    /\baffiliat/i,
    /\bmilitary\b/i,
    /\bemployer\b/i,
    /\bski[- ]?club\b/i,
    /\bapplicable details\b/i,
  ]).filter((field) => !/\b(child|kid).*(grade|age)|grade this school year/i.test(field.label));
  const affiliations = [...new Set(affiliationFields.flatMap((field) => {
    if (field.type === "TEXTAREA" || field.type === "INPUT_TEXT" || /\bapplicable details\b/i.test(field.label)) {
      const value = stringifyValue(field);
      return value ? [value] : [];
    }
    return listValue(field);
  }))];

  const profile: FamilyProfile = {
    internalId: options.internalId,
    tallySubmissionId: options.tallySubmissionId,
    firstName,
    email,
    homeZip: stringifyValue(findField(fields, "homeZip")),
    adultsCount: numberValue(findField(fields, "adultsCount")),
    children: parseChildren(fields),
    skiingStyle: stringifyValue(findField(fields, "skiingStyle")),
    typicalSkiDays: stringifyValue(findField(fields, "typicalSkiDays")),
    likelyDestinations: destinations,
    passesAndMemberships: passes,
    requestedSavingsCategories: categories,
    weekdayFlexibility: stringifyValue(findField(fields, "weekdayFlexibility")),
    affiliations,
    expectedSpend: stringifyValue(findField(fields, "expectedSpend")),
    alreadyKnownSavings: stringifyValue(findField(fields, "alreadyKnownSavings")),
    additionalNotes: stringifyValue(findField(fields, "additionalNotes")),
  };

  return profile;
}

export function profileFromRawTally(options: {
  internalId: string;
  tallySubmissionId: string;
  rawTallyJson: unknown;
}): FamilyProfile {
  return normalizeTallyAnswers({
    internalId: options.internalId,
    tallySubmissionId: options.tallySubmissionId,
    fields: fieldsFromStoredRawTally(options.rawTallyJson),
  });
}

export function profileSummary(profile: FamilyProfile): string {
  return familySummaryLine(profile);
}
