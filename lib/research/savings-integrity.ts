import { floorDollars, roundCents } from "@/lib/research/money";
import type { CanonicalResearch, ResearchOpportunity } from "@/lib/research/schema";

function sameLocation(a: string | null | undefined, b: string | null | undefined): boolean {
  const key = (value: string | null | undefined) => {
    if (!value?.trim()) return null;
    return value.split(",")[0]?.trim().toLowerCase() ?? null;
  };
  const left = key(a);
  const right = key(b);
  if (!left || !right) return true;
  return left === right;
}

export type NightAccessStance = "required" | "unused" | "unknown" | "none";

function evidenceBlob(opportunity: ResearchOpportunity): string {
  return [
    opportunity.name,
    opportunity.category,
    opportunity.eligibility,
    opportunity.familyFit,
    opportunity.countReason,
    opportunity.calculation,
    opportunity.notes,
    opportunity.restrictions ?? "",
    opportunity.recommendedAction,
    opportunity.whyItMatters,
    opportunity.howItWorks,
    opportunity.familyMembersAffected.join(" "),
  ].join(" ");
}

export function opportunityMathHolds(opportunity: ResearchOpportunity): boolean {
  if (opportunity.baselineCost == null || opportunity.opportunityCost == null) return true;
  const expected = roundCents(opportunity.baselineCost - opportunity.opportunityCost);
  const low = roundCents(opportunity.netSavingsLow);
  if (Math.abs(expected - low) <= 1) return true;
  if (Math.abs(floorDollars(expected) - floorDollars(low)) <= 1) return true;
  const explainedGap = /fee|tax|membership/i.test(`${opportunity.calculation} ${opportunity.notes}`);
  return explainedGap && expected >= low - 1;
}

export function hasUnconfirmedDependents(opportunity: ResearchOpportunity): boolean {
  const blob = evidenceBlob(opportunity);
  const claimingDependents = opportunity.familyMembersAffected.some((member) => /dependent/i.test(member));
  if (!claimingDependents) {
    return (
      /dependent/i.test(blob) &&
      /unknown|not provided|not supplied|ask whether|identity .* unknown|relationships were not provided/i.test(blob) &&
      !/not claimed as dependents|other adults are excluded|not counting other adults/i.test(blob)
    );
  }
  if (
    /confirmed (military )?dependents|dependent eligibility is documented|accepted .{0,40}as .{0,40}dependents|verified dependents/i.test(
      blob,
    )
  ) {
    return false;
  }
  return true;
}

export function hasUnconfirmedMemberIdentity(opportunity: ResearchOpportunity): boolean {
  const blob = evidenceBlob(opportunity);
  return (
    /identity (of the )?(veteran|teacher|college student|college-student).*(unknown|not provided)/i.test(blob) ||
    /college-student adult, identity/i.test(blob) ||
    /which adult is the veteran/i.test(blob)
  );
}

export function hasUnconfirmedSavingsUpside(opportunity: ResearchOpportunity): boolean {
  if (opportunity.netSavingsHigh <= opportunity.netSavingsLow + 1) return false;
  return /other adult|if both other|could reach|could materially increase|unspecified adult|if .* also qualify/i.test(
    evidenceBlob(opportunity),
  );
}

export function isHypotheticalGearNeed(opportunity: ResearchOpportunity): boolean {
  const blob = evidenceBlob(opportunity);
  if (!/lease|rental|equipment|gear/i.test(`${opportunity.name} ${opportunity.category}`)) return false;
  if (/already own|already have (fitting )?gear|owns? fitting/i.test(blob) && /not a saving|not counted|no equipment/i.test(blob)) {
    return true;
  }
  return /ownership is unknown|no equipment needs were provided|if they need|if both (teens|kids|children) need|gear ownership is unknown|equipment need.{0,60}unknown/i.test(
    blob,
  );
}

export function nightAccessStance(opportunity: ResearchOpportunity): NightAccessStance {
  const blob = evidenceBlob(opportunity);
  const isDaytimeProduct = /daytime|after 4|night ski|evening access/i.test(blob);
  if (!isDaytimeProduct) return "none";
  if (
    /does not (use|need|ski) (night|after 4|evening)|never skis? (at )?night|no evening skiing|does not expect to ski after 4/i.test(
      blob,
    )
  ) {
    return "unused";
  }
  if (/regular(ly)? (uses|skis)|needs night access|uses evening|skis after 4/i.test(blob) && !/unknown|not supplied/i.test(blob)) {
    return "required";
  }
  if (/night-skiing (behavior|plans) (is|were) unknown|night skiing.{0,40}not supplied|if the family expects/i.test(blob)) {
    return "unknown";
  }
  if (/no lift access after 4/i.test(opportunity.restrictions ?? "") && /unknown|not supplied|if .* night|evening/i.test(blob)) {
    return "unknown";
  }
  return "unknown";
}

export function sacrificesUnconfirmedAccess(opportunity: ResearchOpportunity): boolean {
  return nightAccessStance(opportunity) === "unknown";
}

export function nightAccessBlocksSavings(opportunity: ResearchOpportunity): boolean {
  return nightAccessStance(opportunity) === "required";
}

export function overlappingPassSavings(a: ResearchOpportunity, b: ResearchOpportunity): boolean {
  if (a.id === b.id) return false;
  if (!sameLocation(a.location, b.location)) return false;
  const passLike = (item: ResearchOpportunity) => /pass|ticket|military|veteran|daytime|local/i.test(`${item.name} ${item.category}`);
  if (!passLike(a) || !passLike(b)) return false;
  const daytime = (item: ResearchOpportunity) => /daytime|right-siz|after 4/i.test(`${item.name} ${item.category} ${item.id}`);
  const military = (item: ResearchOpportunity) => /military|veteran|dependent/i.test(`${item.name} ${item.category} ${item.id}`);
  return (daytime(a) && military(b)) || (daytime(b) && military(a));
}

export function canCountInHeadline(opportunity: ResearchOpportunity, research: CanonicalResearch): boolean {
  if (opportunity.alreadyKnownByFamily) return false;
  if (opportunity.verificationStatus === "NEEDS_CHECK") return false;
  if (opportunity.netSavingsLow <= 0) return false;
  if (opportunity.verificationStatus !== "VERIFIED" && opportunity.verificationStatus !== "HIGH_CONFIDENCE") {
    return false;
  }
  const location = opportunity.location?.split(",")[0]?.trim().toLowerCase();
  if (
    location &&
    research.family.destinations.some(
      (destination) => /considering/i.test(destination) && destination.toLowerCase().includes(location),
    )
  ) {
    return false;
  }
  if (!opportunityMathHolds(opportunity)) return false;
  if (hasUnconfirmedDependents(opportunity)) return false;
  if (hasUnconfirmedMemberIdentity(opportunity)) return false;
  if (isHypotheticalGearNeed(opportunity)) return false;
  if (sacrificesUnconfirmedAccess(opportunity)) return false;
  if (nightAccessBlocksSavings(opportunity)) return false;
  return true;
}

export function opportunityIntegrityFlags(opportunity: ResearchOpportunity, research: CanonicalResearch): string[] {
  const flags: string[] = [];
  if (!opportunityMathHolds(opportunity) && opportunity.baselineCost != null && opportunity.opportunityCost != null) {
    flags.push("arithmetic_mismatch");
  }
  if (hasUnconfirmedDependents(opportunity) && opportunity.countedInHeadline) {
    flags.push("unconfirmed_dependents_counted");
  }
  if (hasUnconfirmedMemberIdentity(opportunity) && opportunity.countedInHeadline) {
    flags.push("unconfirmed_identity_counted");
  }
  if (isHypotheticalGearNeed(opportunity) && (opportunity.countedInHeadline || opportunity.tier === "JACKPOT")) {
    flags.push("hypothetical_gear_overclaimed");
  }
  if (sacrificesUnconfirmedAccess(opportunity) && opportunity.countedInHeadline) {
    flags.push("night_access_tradeoff_counted");
  }
  if (nightAccessBlocksSavings(opportunity) && opportunity.netSavingsLow > 0 && opportunity.countedInHeadline) {
    flags.push("required_night_access_ignored");
  }
  if (opportunity.countedInHeadline && !canCountInHeadline(opportunity, research)) {
    flags.push("headline_count_blocked");
  }
  return flags;
}

export function applySavingsIntegrity(research: CanonicalResearch): CanonicalResearch {
  const opportunities = research.opportunities.map((opportunity) => {
    const countable = canCountInHeadline(opportunity, research);
    const nextTier =
      !countable && opportunity.tier === "JACKPOT" ? "STRONG" : opportunity.tier;
    if (opportunity.countedInHeadline === countable && opportunity.tier === nextTier) {
      return opportunity;
    }
    return { ...opportunity, countedInHeadline: countable, tier: nextTier };
  });
  return { ...research, opportunities };
}
