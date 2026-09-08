import { COMPELLING_SAVINGS_MIN } from "@/config/compelling-savings";
import type { OfferMode } from "@/lib/pipeline/status";
import type { CanonicalResearch } from "./schema";

export type OfferDecision = {
  offerMode: OfferMode;
  reason: string;
  coreSavingsLow: number;
  confidence: CanonicalResearch["summary"]["confidence"];
  countableOpportunityCount: number;
};

export type OfferInputs = {
  coreSavingsLow: number;
  confidence: CanonicalResearch["summary"]["confidence"] | string;
  countableOpportunityCount: number;
  compellingMin?: number;
};

export function countableOpportunities(research: CanonicalResearch): number {
  return research.opportunities.filter(
    (item) =>
      item.countedInHeadline &&
      !item.alreadyKnownByFamily &&
      item.tier !== "WATCH" &&
      (item.verificationStatus === "VERIFIED" || item.verificationStatus === "HIGH_CONFIDENCE") &&
      item.netSavingsLow > 0,
  ).length;
}

export function decideOfferMode(input: OfferInputs): OfferDecision {
  const min = input.compellingMin ?? COMPELLING_SAVINGS_MIN;
  const confidence = String(input.confidence).toUpperCase();
  const coreSavingsLow = input.coreSavingsLow ?? 0;
  const countableOpportunityCount = input.countableOpportunityCount ?? 0;

  const compelling =
    coreSavingsLow >= min && confidence !== "LOW" && countableOpportunityCount >= 1;

  if (compelling) {
    return {
      offerMode: "SCAN_UPSELL",
      reason: `Conservative core savings of $${Math.round(coreSavingsLow)} meet the $${min} threshold, confidence is ${confidence}, and ${countableOpportunityCount} countable opportunit${countableOpportunityCount === 1 ? "y exists" : "ies exist"}.`,
      coreSavingsLow,
      confidence: confidence as OfferDecision["confidence"],
      countableOpportunityCount,
    };
  }

  const reasons: string[] = [];
  if (coreSavingsLow < min) {
    reasons.push(`conservative core savings of $${Math.round(coreSavingsLow)} are below the $${min} threshold`);
  }
  if (confidence === "LOW") {
    reasons.push("research confidence is LOW");
  }
  if (countableOpportunityCount < 1) {
    reasons.push("there is no credible countable savings opportunity");
  }

  return {
    offerMode: "FULL_PLAN_FREE",
    reason: `Full plan given free because ${reasons.join("; ")}.`,
    coreSavingsLow,
    confidence: (["HIGH", "MEDIUM", "LOW"].includes(confidence)
      ? confidence
      : "LOW") as OfferDecision["confidence"],
    countableOpportunityCount,
  };
}
