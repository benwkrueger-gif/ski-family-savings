import type {
  DisplayOpportunity,
  DisplaySavingsSummary,
} from "@/lib/research/display-savings";
import type { CanonicalResearch } from "@/lib/research/schema";
import {
  hasUnconfirmedDependents,
  isHypotheticalGearNeed,
  sacrificesUnconfirmedAccess,
} from "@/lib/research/savings-integrity";

const TIER_RANK: Record<DisplayOpportunity["tier"], number> = {
  JACKPOT: 0,
  STRONG: 1,
  USEFUL: 2,
  WATCH: 3,
};

const HEADING_MAX = 90;
const EXPLANATION_MAX = 500;
const OPENING_MAX = 500;
const MY_TAKE_MAX = 500;
const QUESTION_MAX = 140;

export function shortMountainName(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const primary = value.split(",")[0]?.trim() ?? "";
  const cleaned = primary
    .replace(/\s+(considering|not yet named|possibly).*$/i, "")
    .replace(/\s+Ski Area$/i, "")
    .trim();
  if (!cleaned) return null;
  if (/^(vermont|new hampshire|maine|massachusetts|new york|connecticut)$/i.test(cleaned)) return null;
  if (/few other|not yet named|not yet selected|variety|participating|online member/i.test(cleaned)) return null;
  return cleaned;
}

export function scanMountainName(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const beforeOther = value.split(/\s+and other\b/i)[0]?.trim() ?? value;
  const name = shortMountainName(beforeOther);
  if (!name) return null;
  if (/\b(indy|ikon|epic pass|mountain collective)\b/i.test(name)) return null;
  return name;
}

export function kidsPhrase(research: CanonicalResearch): string {
  const kids = research.family.children;
  if (kids.length === 0) return "";
  const one = (age: number) => {
    const article = /^(8|11|18)/.test(String(age)) ? "an" : "a";
    return `${article} ${age}-year-old`;
  };
  if (kids.length === 1) return one(kids[0]!.age);
  if (kids.length === 2) return `${one(kids[0]!.age)} and ${one(kids[1]!.age)}`;
  return `${kids.length} kids`;
}

export function familyMountains(research: CanonicalResearch): string[] {
  const names = research.family.destinations
    .map((item) => scanMountainName(item) ?? shortMountainName(item))
    .filter((item): item is string => Boolean(item));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

export function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.slice(-1)[0]}`;
}

export function highlightOpportunities(display: DisplaySavingsSummary): DisplayOpportunity[] {
  const main = display.opportunities
    .filter((item) => item.tier !== "WATCH")
    .sort((a, b) => {
      const home = (item: DisplayOpportunity) =>
        /home-mountain/i.test(item.opportunity.category) ? 0 : 1;
      return (
        home(a) - home(b) ||
        TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
        b.opportunity.netSavingsHigh - a.opportunity.netSavingsHigh
      );
    });
  const extras = display.opportunities.filter((item) => {
    if (item.tier !== "WATCH") return false;
    const blob = `${item.opportunity.category} ${item.opportunity.name} ${item.opportunity.id}`;
    return /4pass|statewide|variety|multi-resort|gear|lease|daytime|night ski|military|veteran/i.test(blob);
  });
  const picked = [...main];
  for (const extra of extras) {
    if (picked.length >= 3) break;
    if (!picked.some((item) => item.opportunity.id === extra.opportunity.id)) picked.push(extra);
  }
  return picked.slice(0, 3);
}

export function clipScanText(text: string, max: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  const sentences = cleaned.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) ?? [cleaned];
  let out = "";
  for (const sentence of sentences) {
    const piece = sentence.trim();
    if (!piece) continue;
    const next = out ? `${out} ${piece}` : piece;
    if (next.length > max) break;
    out = next;
  }
  if (out.length >= 12) return out;
  return cleaned.slice(0, Math.max(0, max - 1)).trim();
}

const BLAND_SCAN_PATTERNS = [
  /I'?ll keep the exact details in the (full )?Plan/i,
  /details are in the (full )?Plan/i,
  /There's a useful option/i,
  /Something worth a look/i,
  /a couple things worth checking/i,
  /time-sensitive lesson option/i,
  /If I were in your shoes, I'?d start with the home-mountain question/i,
  /There's a way to add extra resorts if you're actually going to use those days/i,
  /kids lesson window/i,
  /More mountains only if you want them/i,
  /^An? off-slope option/i,
  /^A useful (season )?option/i,
];

export function blandScanIssues(text: string): string[] {
  return BLAND_SCAN_PATTERNS.filter((pattern) => pattern.test(text)).map(
    () => "Scan copy is generic or teases Plan details",
  );
}

type ScanShape =
  | "lesson"
  | "multi_resort"
  | "kids_access"
  | "kids_program"
  | "off_slope"
  | "gear"
  | "home_pass"
  | "affiliation"
  | "other";

function classifyScanShape(item: DisplayOpportunity): ScanShape {
  const blob = `${item.opportunity.category} ${item.opportunity.name}`;
  if (/lesson/i.test(blob)) return "lesson";
  if (/multi-resort|indy|statewide|4pass/i.test(blob)) return "multi_resort";
  if (/military|veteran|dependent/i.test(blob) && /pass|discount|ticket/i.test(blob)) return "affiliation";
  if (/home-mountain|youth/i.test(blob) && /pass|access|ticket/i.test(blob)) return "kids_access";
  if (/passport|youth/i.test(blob) && /pass|access|ticket|passport/i.test(blob)) return "kids_access";
  if (/camp|kids ski|kids program/i.test(blob)) return "kids_program";
  if (/off-mountain|off-slope|daycation|activit/i.test(blob)) return "off_slope";
  if (/gear|lease|rental|equipment/i.test(blob)) return "gear";
  if (/destination/i.test(blob)) return "other";
  if (/pass|ticket/i.test(blob)) return "home_pass";
  if (/\bkids\b/i.test(item.opportunity.category)) return "kids_access";
  return "other";
}

function countKindLabel(item: DisplayOpportunity): "counted" | "optional" | "conditional" | "watch" {
  if (item.firm) return "counted";
  if (item.kind === "watch" || item.tier === "WATCH") return "watch";
  if (item.kind === "conditional") return "conditional";
  return "optional";
}

function opportunityMountain(item: DisplayOpportunity, research: CanonicalResearch): string | null {
  return scanMountainName(item.opportunity.location) ?? familyMountains(research)[0] ?? null;
}

function mentionsWeekday(item: DisplayOpportunity): boolean {
  return /weekday|monday through thursday|midweek/i.test(
    `${item.opportunity.name} ${item.opportunity.eligibility} ${item.opportunity.howItWorks} ${item.opportunity.familyFit}`,
  );
}

function mentionsSharedLesson(item: DisplayOpportunity): boolean {
  return /share/i.test(
    `${item.opportunity.restrictions} ${item.opportunity.familyFit} ${item.opportunity.countReason} ${item.opportunity.recommendedAction}`,
  );
}

function consideringMountain(item: DisplayOpportunity, research: CanonicalResearch): boolean {
  return research.family.destinations.some(
    (destination) =>
      /considering|maybe|possibly/i.test(destination) &&
      (item.opportunity.location ?? "").toLowerCase().includes(
        (shortMountainName(destination.split(",")[0]) ?? "").toLowerCase(),
      ),
  );
}

export type ScanFindingSeed = {
  mountain: string | null;
  opportunityType: string;
  countKind: "counted" | "optional" | "conditional" | "watch";
  whyItMatters: string;
  suggestion: string;
  caveat: string | null;
};

export function buildScanFindingSeed(
  item: DisplayOpportunity,
  research: CanonicalResearch,
): ScanFindingSeed {
  const shape = classifyScanShape(item);
  const mountain = opportunityMountain(item, research);
  const kids = kidsPhrase(research);
  const countKind = countKindLabel(item);
  const atMountain = mountain ? ` at ${mountain}` : "";
  const weekday = mentionsWeekday(item);

  if (shape === "lesson") {
    const kindLabel = weekday ? "weekday private lesson" : "private lesson";
    return {
      mountain,
      opportunityType: kindLabel,
      countKind,
      whyItMatters: kids
        ? `A ${kindLabel}${atMountain} looks cheaper than the usual rate for ${kids}.`
        : `A ${kindLabel}${atMountain} looks cheaper than the usual rate.`,
      suggestion: "I'd look at that lesson first.",
      caveat: mentionsSharedLesson(item)
        ? "It only works well if the kids can share a lesson, so I'd confirm ability and skiing vs snowboarding before treating it as a sure thing."
        : null,
    };
  }

  if (shape === "multi_resort") {
    return {
      mountain,
      opportunityType: "extra-resort pass",
      countKind,
      whyItMatters:
        "There's a cheaper way to add other independent mountains, but only if you were already going to buy that kind of pass.",
      suggestion: "I wouldn't buy it just because it exists, and I wouldn't add it to the counted number.",
      caveat: "Skip it unless those extra days are actually on the calendar.",
    };
  }

  if (shape === "kids_access") {
    return {
      mountain,
      opportunityType: "kids' season access",
      countKind,
      whyItMatters: kids
        ? `Your ${kids.replace(/^an? /, "")} still ${/\d+ kids| and /.test(kids) ? "look" : "looks"} like a good fit for kids' season access${atMountain}.`
        : `There's a kids' season-access window${atMountain}.`,
      suggestion:
        countKind === "counted"
          ? "That's the one I'd lock in before spending on extras."
          : "I'd confirm it actually applies before counting on it.",
      caveat: countKind === "counted" ? null : "Don't treat this as money in the bank yet.",
    };
  }

  if (shape === "kids_program") {
    return {
      mountain,
      opportunityType: "kids program",
      countKind,
      whyItMatters: `There's a kids program${atMountain} that could help if those days are actually planned.`,
      suggestion: "I'd wait until the current details are posted before counting on it.",
      caveat: "I'm not adding this to the counted number yet.",
    };
  }

  if (shape === "off_slope") {
    return {
      mountain,
      opportunityType: "off-slope add-on",
      countKind,
      whyItMatters: `There's an off-slope add-on${atMountain} for days you're there but not skiing.`,
      suggestion: "I'd skip it unless you'll actually use that indoor time a lot.",
      caveat: null,
    };
  }

  if (shape === "gear") {
    return {
      mountain,
      opportunityType: "season gear",
      countKind,
      whyItMatters: kids
        ? `A season gear setup could help ${kids}, but only if they don't already have gear that fits.`
        : "A season gear setup could help, but only if you still need equipment.",
      suggestion: "I wouldn't buy this yet. Confirm what you already own and what currently fits.",
      caveat: "This stays unresolved until those questions are answered.",
    };
  }

  if (shape === "affiliation") {
    return {
      mountain,
      opportunityType: "affiliation pass",
      countKind,
      whyItMatters: mountain
        ? `There's a possible veteran or military pass price at ${mountain}, but I don't yet know who in the family qualifies.`
        : "There's a possible veteran or military pass price, but I don't yet know who in the family qualifies.",
      suggestion: "I'd confirm who the veteran is and which kids or adults would actually be treated as dependents.",
      caveat: "Don't count this until those details are clear.",
    };
  }

  if (shape === "home_pass") {
    return {
      mountain,
      opportunityType: "pass setup",
      countKind,
      whyItMatters: `The pass setup${atMountain} may cost less if you only buy the access you'll actually use.`,
      suggestion: "I'd confirm ages, night skiing, and what's already purchased before changing products.",
      caveat: "Nothing here is counted until those details are clear.",
    };
  }

  const considering = consideringMountain(item, research);
  return {
    mountain,
    opportunityType: mountain ? `option at ${mountain}` : "season option",
    countKind,
    whyItMatters: considering
      ? `${mountain ?? "That extra mountain"} still looks like a maybe, so I wouldn't build the season around it.`
      : mountain
        ? `There's a useful call tied to ${mountain} if it matches how you actually ski.`
        : "There's a useful call here if it matches how you actually ski.",
    suggestion: considering
      ? "Decide if the trip is real before spending."
      : "I'd only follow this if it matches the winter you actually have.",
    caveat: countKind === "counted" ? null : "Keep this separate from the counted number.",
  };
}

export function fallbackFindingCopy(
  item: DisplayOpportunity,
  research: CanonicalResearch,
): { heading: string; explanation: string } {
  const seed = buildScanFindingSeed(item, research);
  const mountain = seed.mountain;
  let heading: string;
  if (seed.opportunityType === "weekday private lesson" || seed.opportunityType === "private lesson") {
    heading = mountain ? `Start with a ${seed.opportunityType} at ${mountain}` : `Start with a ${seed.opportunityType}`;
  } else if (seed.opportunityType === "extra-resort pass") {
    heading = "Extra mountains only if you'll use them";
  } else if (seed.opportunityType === "kids' season access") {
    heading = mountain ? `Kids' season access at ${mountain}` : "Kids' season access";
  } else if (seed.opportunityType === "off-slope add-on") {
    heading = mountain ? `Off-slope extras at ${mountain}` : "Off-slope extras only if you'll use them";
  } else if (seed.opportunityType === "season gear") {
    heading = "Don't buy extra gear until you know you need it";
  } else if (seed.opportunityType === "affiliation pass") {
    heading = mountain ? `Confirm the military pass price at ${mountain}` : "Confirm the military pass price before counting it";
  } else if (seed.opportunityType === "pass setup") {
    heading = mountain ? `Check the pass setup at ${mountain}` : "Check the pass setup before you change it";
  } else if (seed.opportunityType === "kids program") {
    heading = mountain ? `A kids program at ${mountain}` : "A kids program if those days happen";
  } else {
    heading = mountain ? `${mountain} only if it is actually happening` : "A call that depends on your plans";
  }

  const countedLine =
    seed.countKind === "counted"
      ? "That's in the counted number."
      : seed.countKind === "optional"
        ? "This stays optional."
        : seed.countKind === "conditional"
          ? "This only counts if it actually applies."
          : "I'm not counting this yet.";

  const explanation = [seed.whyItMatters, countedLine, seed.suggestion, seed.caveat].filter(Boolean).join(" ");
  return {
    heading: clipScanText(heading, HEADING_MAX),
    explanation: clipScanText(explanation, EXPLANATION_MAX),
  };
}

function firstFirmItem(display: DisplaySavingsSummary): DisplayOpportunity | undefined {
  return highlightOpportunities(display).find((item) => item.firm) ?? highlightOpportunities(display)[0];
}

export function fallbackScanOpening(research: CanonicalResearch, display: DisplaySavingsSummary): string {
  const kids = kidsPhrase(research);
  const mountains = familyMountains(research).slice(0, 3);
  const days = research.family.annualDays?.trim();
  const picture = [
    kids ? `You've got ${kids}` : null,
    mountains.length ? `and a season around ${joinList(mountains)}` : null,
    days ? `about ${/day/i.test(days) ? days : `${days} days`} on snow` : null,
  ]
    .filter(Boolean)
    .join(", ")
    .replace(/^and /, "");

  const first = firstFirmItem(display);
  const shape = first ? classifyScanShape(first) : "other";
  const mountain = first ? opportunityMountain(first, research) : mountains[0];
  let priority: string;
  if (shape === "lesson") {
    priority = mountain
      ? `I'd start with the lesson question at ${mountain}.`
      : "I'd start with the lesson question.";
  } else if (shape === "kids_access") {
    priority = mountain
      ? `I'd start with kids' season access at ${mountain}.`
      : "I'd start with the kids' season-access question.";
  } else if (display.firmLow <= 0) {
    priority = "I wouldn't spend more until a couple open questions are clearer.";
  } else {
    priority = "Here's what I'd actually pay attention to.";
  }

  const knownPass = [...research.paidPlan.alreadyDoingRight, ...research.existingKnownSavings].some((item) =>
    /pass/i.test(`${item.title} ${item.note}`),
  );
  const already = knownPass ? " You already have a pass in the mix, so I left that out of newly found savings." : "";

  return clipScanText(
    `Thanks for letting me look at this.${picture ? ` ${picture}.` : ""} ${priority}${already}`,
    OPENING_MAX,
  );
}

export function fallbackScanMyTake(research: CanonicalResearch, display: DisplaySavingsSummary): string {
  const highlighted = highlightOpportunities(display);
  const firm = highlighted.filter((item) => item.firm);
  const optional = highlighted.filter((item) => !item.firm);
  const mountains = familyMountains(research);
  const first = firm[0] ?? highlighted[0];
  if (!first) {
    return clipScanText(
      "I'd confirm the open questions before spending more. A useful 'not yet' is better than a maybe that doesn't fit.",
      MY_TAKE_MAX,
    );
  }
  const firstCopy = fallbackFindingCopy(first, research);
  if (display.firmLow <= 0) {
    return clipScanText(
      `I wouldn't treat any of this as money in the bank yet. ${firstCopy.heading.replace(/\.$/, "")}. A useful "not yet" is better than spending on a maybe.`,
      MY_TAKE_MAX,
    );
  }
  const lead = firstCopy.heading.replace(/^Start with /i, "").replace(/^Check /i, "");
  const leadLower = lead.charAt(0).toLowerCase() + lead.slice(1);
  const extraLabels = optional.slice(0, 2).map((item) => {
    const mountain = opportunityMountain(item, research);
    const shape = classifyScanShape(item);
    if (shape === "multi_resort") return "extra mountains";
    if (shape === "off_slope") return mountain ? `off-slope extras at ${mountain}` : "off-slope extras";
    return mountain ?? "the extras";
  });
  const optionalBit = extraLabels.length
    ? ` Then treat ${joinList([...new Set(extraLabels)])} as only-if-you-use-them ideas, not as part of the counted number.`
    : mountains.length > 1
      ? " Then decide whether the extra mountain days are actually happening."
      : " Then ignore anything that isn't actually on the calendar.";
  return clipScanText(`If I were in your shoes, I'd start with ${leadLower}.${optionalBit}`, MY_TAKE_MAX);
}

export function fallbackScanQuestions(research: CanonicalResearch, display: DisplaySavingsSummary): string[] {
  const questions: string[] = [];
  for (const item of display.opportunities) {
    if (sacrificesUnconfirmedAccess(item.opportunity)) {
      const mountain = opportunityMountain(item, research) ?? "your home mountain";
      questions.push(
        `Do you or the kids expect to use ${mountain}'s night skiing, including after-school or evening trips?`,
      );
    }
    if (hasUnconfirmedDependents(item.opportunity)) {
      questions.push("Who is the veteran, and which family members would actually qualify as dependents?");
    }
    if (isHypotheticalGearNeed(item.opportunity)) {
      questions.push("Do the skiers who would lease already have gear that fits?");
    }
  }
  for (const item of highlightOpportunities(display)) {
    const seed = buildScanFindingSeed(item, research);
    if (mentionsSharedLesson(item) && !questions.some((question) => /share a lesson|similar level/i.test(question))) {
      questions.push("Do the kids ski at a similar level and the same discipline?");
    }
    if (seed.opportunityType === "extra-resort pass") {
      questions.push("Are those extra mountain days actually on the calendar?");
    }
    if (seed.opportunityType === "off-slope add-on") {
      questions.push("Will you actually use the indoor time enough to bother?");
    }
    if (consideringMountain(item, research) && seed.mountain) {
      questions.push(`Is ${seed.mountain} actually happening this winter?`);
    }
  }
  return [...new Set(questions)].slice(0, 3).map((question) => clipScanText(question, QUESTION_MAX));
}

export function buildScanFindingSeeds(
  display: DisplaySavingsSummary,
  research: CanonicalResearch,
): ScanFindingSeed[] {
  return highlightOpportunities(display).map((item) => buildScanFindingSeed(item, research));
}
