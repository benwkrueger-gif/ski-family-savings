import { SAVINGS_PLAN_PRICE_LABEL } from "@/config/compelling-savings";
import type { OfferMode } from "@/lib/pipeline/status";
import type { DisplaySavingsSummary } from "@/lib/research/display-savings";

const DOLLAR_AMOUNT = /\$\d+(?:,\d{3})*(?:\.\d{1,2})?/g;

export function extractDollarAmounts(text: string): string[] {
  return text.match(DOLLAR_AMOUNT) ?? [];
}

export function approvedScanSavingsStrings(
  display: DisplaySavingsSummary,
  offerMode: OfferMode,
): string[] {
  const headline =
    display.firmLow > 0 ? display.headlineSavings : (display.conditionalSavings ?? display.headlineSavings);
  const values = [headline];
  if (offerMode === "SCAN_UPSELL") values.push(SAVINGS_PLAN_PRICE_LABEL);
  return values.filter(Boolean);
}

export function approvedScanDollarSet(
  display: DisplaySavingsSummary,
  offerMode: OfferMode,
): Set<string> {
  return new Set(approvedScanSavingsStrings(display, offerMode).flatMap(extractDollarAmounts));
}

export function unapprovedScanDollars(
  text: string,
  approved: Iterable<string>,
): string[] {
  const allowed = approved instanceof Set ? approved : new Set(approved);
  return [...new Set(extractDollarAmounts(text).filter((amount) => !allowed.has(amount)))];
}

export function approvedHeadlineSavingsLine(display: DisplaySavingsSummary): string {
  const range =
    display.firmLow > 0 ? display.headlineSavings : (display.conditionalSavings ?? display.headlineSavings);
  if (display.firmLow > 0) {
    return `I found roughly ${range} in counted savings.`;
  }
  return `I couldn't lock in a sure number yet. If a couple things still go your way, it could be about ${range}.`;
}
