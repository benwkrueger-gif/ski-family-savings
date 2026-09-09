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

function refersToCustomerAsTheFamily(text: string): boolean {
  return /\bthe family\b/i.test(withoutFamilyProductPhrases(text));
}

function withoutFamilyProductPhrases(text: string): string {
  return text.replace(
    /\bthe family\s+(pass|passes|options?|days?|cards?|access|pack|packs|rate|rates|product|products)\b/gi,
    "",
  );
}

export function rewriteCustomerAsYou(text: string): string {
  return text.replace(
    /\bthe family\b(?!\s+(pass|passes|options?|days?|cards?|access|pack|packs|rate|rates|product|products)\b)/gi,
    "your family",
  );
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
  if (refersToCustomerAsTheFamily(text)) issues.push("the family");
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
