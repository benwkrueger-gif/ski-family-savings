const BANNED_CUSTOMER_PHRASES = [
  /\bthe intake\b/i,
  /\bcanonical research\b/i,
  /\bthe source confirms\b/i,
  /\boptimized scenario\b/i,
  /\bthe family's stated\b/i,
  /\bhousehold's necessary\b/i,
  /\bthe relevant opportunity\b/i,
  /\bfinancial need\b/i,
  /\bhousehold\b/i,
  /\bmatched the saved research\b/i,
  /\bi checked .{0,90} on (january|february|march|april|may|june|july|august|september|october|november|december)/i,
  /\bi would rather tell you that than/i,
  /\bnot a generic ski-family\b/i,
  /\bi'?m not pretending\b/i,
  /\bsavings i could stand behind\b/i,
  /\badding every square\b/i,
  /\bconfidence in this picture\b/i,
  /\bwhat i was able to confirm\b/i,
  /\bNEEDS_CHECK\b/,
  /\bHIGH_CONFIDENCE\b/,
  /\bVERIFIED\b/,
];

const FAMILY_PRODUCT_PHRASE =
  /\bthe family\s+(pass|passes|options?|days?|cards?|access|pack|packs|rate|rates|product|products)\b/gi;
const HARMLESS_FAMILY_LOCATOR =
  /\b(?:who|someone|anyone|somebody|people|kids|adults|person)\s+in the family\b/gi;
const HARMLESS_FAMILY_POSSESSIVE = /\bthe family's (?!stated\b)/gi;
const UNSUPPORTED_FAMILY_ELIGIBILITY_CLAIM =
  /\bthe family\s+(qualifies|qualified|is eligible|are eligible|was eligible|were eligible|gets?\b|got\b|receives?|received)\b/i;

function withoutHarmlessFamilyPhrases(text: string): string {
  return text
    .replace(FAMILY_PRODUCT_PHRASE, "")
    .replace(HARMLESS_FAMILY_LOCATOR, "")
    .replace(HARMLESS_FAMILY_POSSESSIVE, "");
}

export function unsupportedFamilyClaim(text: string): boolean {
  const rest = withoutHarmlessFamilyPhrases(text);
  return (
    UNSUPPORTED_FAMILY_ELIGIBILITY_CLAIM.test(rest) ||
    /\bthe family explicitly\b/i.test(rest) ||
    /\bthe family's stated\b/i.test(rest)
  );
}

export function rewriteCustomerAsYou(text: string): string {
  return text.replace(/\bthe household\b/gi, "you").replace(/\bhousehold's\b/gi, "your");
}

export function isPlanDetailTeaser(text: string): boolean {
  return (
    /keep the (exact )?details in the (full )?Plan/i.test(text) ||
    /details are in the (full )?Plan/i.test(text) ||
    /I'?ll (put|leave|keep) .{0,40} in the (full )?Plan/i.test(text)
  );
}

export function writingVoiceIssues(text: string): string[] {
  const issues: string[] = [];
  if (text.includes("\u2014")) issues.push("em dash");
  if (unsupportedFamilyClaim(text)) issues.push("the family");
  for (const pattern of BANNED_CUSTOMER_PHRASES) {
    if (pattern.test(text)) issues.push(pattern.source);
  }
  return issues;
}

export function collectWritingText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(collectWritingText).join("\n");
  if (value && typeof value === "object") {
    return Object.values(value).map(collectWritingText).join("\n");
  }
  return "";
}
