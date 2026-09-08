import { COMPELLING_SAVINGS_MIN } from "@/config/compelling-savings";
import { decideOfferMode, type OfferDecision } from "@/lib/research/offer-mode";
import {
  countableLedgerOpportunities,
  type OpportunityTierCounts,
} from "@/lib/research/opportunity-counts";
import {
  formatCustomerRange,
  displayCostPair,
  roundCents,
} from "@/lib/research/money";
import type { CanonicalResearch, ResearchOpportunity } from "@/lib/research/schema";

export type DisplayTier = "JACKPOT" | "STRONG" | "USEFUL" | "WATCH";
export type CountKind = "firm" | "conditional" | "optional" | "watch";
export type ScenarioKind = "confirmed" | "assumption" | "alternative";

export type ScenarioProduct = {
  name: string;
  price: string;
  estimated?: boolean;
};

export type OpportunityScenario = {
  label: string;
  kind: ScenarioKind;
  assumption?: string;
  baseline?: string;
  optimized?: string;
  savings?: string;
  mathNote?: string;
  buy?: ScenarioProduct[];
  comparedWith?: ScenarioProduct[];
};

export type DisplayOpportunity = {
  opportunity: ResearchOpportunity;
  tier: DisplayTier;
  firm: boolean;
  kind: CountKind;
  facts: string[];
  assumptions: string[];
  scenarios: OpportunityScenario[];
  sourceCheckedNote?: string;
};

export type DisplaySavingsSummary = {
  firmLow: number;
  firmHigh: number;
  conditionalLow: number;
  conditionalHigh: number;
  offer: OfferDecision;
  counts: OpportunityTierCounts;
  headlineSavings: string;
  conditionalSavings?: string;
  opportunities: DisplayOpportunity[];
};

const TIER_KEY = {
  JACKPOT: "jackpotCount",
  STRONG: "strongCount",
  USEFUL: "usefulCount",
  WATCH: "watchCount",
} as const;

export function locationKey(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const cleaned = value
    .split(",")[0]
    ?.replace(/\s+(considering|not yet named|possibly).*$/i, "")
    .replace(/\s+Ski Area$/i, "")
    .trim();
  return cleaned ? cleaned.toLowerCase() : null;
}

export function tierFromConservativeLow(netSavingsLow: number): DisplayTier {
  if (netSavingsLow >= 250) return "JACKPOT";
  if (netSavingsLow >= 50) return "STRONG";
  if (netSavingsLow > 0) return "USEFUL";
  return "WATCH";
}

export function destinationIsConsidering(
  research: CanonicalResearch,
  location: string | null | undefined,
): boolean {
  const key = locationKey(location);
  if (!key) return false;
  return research.family.destinations.some((destination) => {
    if (!/considering/i.test(destination)) return false;
    return locationKey(destination) === key;
  });
}

function appliesToOpportunity(text: string, opportunity: ResearchOpportunity): boolean {
  const key = locationKey(opportunity.location);
  if (key && text.toLowerCase().includes(key)) return true;
  if (/home-mountain|affordability/i.test(opportunity.category) && /pass has already been purchased|already been purchased or waived|ski-club/i.test(text)) {
    return true;
  }
  return false;
}

export function isPurchaseUnresolved(
  opportunity: ResearchOpportunity,
  research: CanonicalResearch,
): boolean {
  const own = `${opportunity.notes} ${opportunity.countReason} ${opportunity.restrictions ?? ""}`;
  if (/already (been )?purchased|already bought|already received|waived through|ski-club registration/i.test(own)) {
    return true;
  }
  return research.summary.humanReviewFlags.some(
    (flag) =>
      /already (been )?purchased|already bought|waived/i.test(flag) &&
      appliesToOpportunity(flag, opportunity),
  );
}

export function isFirmlyCountable(
  opportunity: ResearchOpportunity,
  research: CanonicalResearch,
): boolean {
  if (opportunity.alreadyKnownByFamily) return false;
  if (!opportunity.countedInHeadline) return false;
  if (opportunity.verificationStatus === "NEEDS_CHECK") return false;
  if (opportunity.netSavingsLow <= 0) return false;
  if (destinationIsConsidering(research, opportunity.location)) return false;
  if (isPurchaseUnresolved(opportunity, research)) return false;
  return (
    opportunity.verificationStatus === "VERIFIED" ||
    opportunity.verificationStatus === "HIGH_CONFIDENCE"
  );
}

export function displayTierFor(opportunity: ResearchOpportunity): DisplayTier {
  if (opportunity.alreadyKnownByFamily) return "WATCH";
  if (opportunity.verificationStatus === "NEEDS_CHECK") return "WATCH";
  return tierFromConservativeLow(opportunity.netSavingsLow);
}

export function countKindFor(
  opportunity: ResearchOpportunity,
  research: CanonicalResearch,
  tier: DisplayTier,
): CountKind {
  if (isFirmlyCountable(opportunity, research)) return "firm";
  if (tier === "WATCH") return "watch";
  if (destinationIsConsidering(research, opportunity.location)) return "optional";
  if (isPurchaseUnresolved(opportunity, research)) return "conditional";
  if (!opportunity.countedInHeadline) return "optional";
  return "conditional";
}

function genericScenarios(opportunity: ResearchOpportunity): OpportunityScenario[] {
  if (opportunity.baselineCost == null || opportunity.opportunityCost == null) {
    if (opportunity.netSavingsLow <= 0 && opportunity.netSavingsHigh > 0) {
      return [
        {
          label: "If it actually applies",
          kind: "assumption",
          savings: formatCustomerRange(opportunity.netSavingsLow, opportunity.netSavingsHigh),
        },
      ];
    }
    return [];
  }

  const pair = displayCostPair(opportunity.baselineCost, opportunity.opportunityCost);
  if (opportunity.netSavingsLow <= 0) {
    return [
      {
        label: "If it actually applies",
        kind: "assumption",
        baseline: pair.baseline,
        optimized: pair.optimized,
        savings: pair.savings,
      },
    ];
  }

  return [
    {
      label: "This option",
      kind: opportunity.verificationStatus === "NEEDS_CHECK" ? "assumption" : "confirmed",
      baseline: pair.baseline,
      optimized: pair.optimized,
      savings: pair.savings,
    },
  ];
}

function customerPair(baseline: number, optimized: number): Pick<OpportunityScenario, "baseline" | "optimized" | "savings"> {
  const pair = displayCostPair(baseline, optimized);
  return {
    baseline: pair.baseline,
    optimized: pair.optimized,
    savings: pair.savings,
  };
}

function cochransScenarios(): {
  facts: string[];
  assumptions: string[];
  scenarios: OpportunityScenario[];
  sourceCheckedNote: string;
} {
  return {
    facts: [
      "Official 2026/27 family pass: $295 before 6% Vermont tax.",
      "Reduced family-pass amounts on the form: $0, $20, $50, or $100.",
      "Email skiarea@cochranskiarea.com if they need help.",
    ],
    assumptions: [
      "This season's Cochran's pass may already have been purchased or waived through ski-club registration.",
      "The lower savings estimate uses the $100 reduced tier, not the free pass.",
    ],
    scenarios: [
      {
        label: "If you still need a pass and use the $100 reduced price",
        kind: "assumption",
        ...customerPair(312.7, 106),
      },
      {
        label: "If the pass is covered at $0",
        kind: "alternative",
        ...customerPair(312.7, 0),
      },
    ],
    sourceCheckedNote: "Details checked Sep 7, 2026.",
  };
}

function madRiverScenarios(): {
  facts: string[];
  assumptions: string[];
  scenarios: OpportunityScenario[];
  sourceCheckedNote: string;
} {
  return {
    facts: [
      "Fall sale: September 8 through September 30, 2026. After September 30, Stark Mountain Cards are no longer sold.",
      "Fall prices before 6% Vermont tax: 3-Day Stark Mountain Card $320, Family 3-Day $425, 6-Day $530, Family 6-Day $600, Adult Midweek $479.",
      "Kids 5 and under: free season pass. Kids 12 and under of shareholders or passholders can get free season passes if registered before September 30.",
      "Family Stark Mountain Cards cover one adult plus free season passes for dependent children under 12. Only one Stark Mountain Card per person. Limited inventory. Skiing only, not snowboarding.",
    ],
    assumptions: [
      "Mad River Glen was listed as considering, not a definite plan.",
      "The three-day baseline includes $300 of junior day tickets, about three days at $100 for the 7-year-old. That $100 figure is not an official 2026/27 window price.",
      "The six-day baseline includes $600 of junior day tickets, about six days at $100 for the 7-year-old. The 5-year-old may already be free on the published kids chart.",
      "The three-day, six-day, and midweek options are alternatives, not something to add together.",
    ],
    scenarios: [
      {
        label: "3 family days",
        kind: "assumption",
        assumption: "Junior tickets in the comparison are an estimate, about $100 a day for the 7-year-old, not an official 2026/27 window price.",
        buy: [
          { name: "Family 3-Day Stark Mountain Card", price: "$425" },
          { name: "Regular 3-Day Stark Mountain Card", price: "$320" },
        ],
        comparedWith: [
          { name: "Regular 3-Day Stark Mountain Card", price: "$320" },
          { name: "Regular 3-Day Stark Mountain Card", price: "$320" },
          { name: "Junior tickets, about 3 days", price: "$300", estimated: true },
        ],
        ...customerPair(996.4, 789.7),
      },
      {
        label: "6 flexible family days",
        kind: "alternative",
        assumption: "Same junior-ticket estimate at six days. Pick this or the 3-day or weekday option, not all three.",
        buy: [
          { name: "Family 6-Day Stark Mountain Card", price: "$600" },
          { name: "Regular 6-Day Stark Mountain Card", price: "$530" },
        ],
        comparedWith: [
          { name: "Regular 6-Day Stark Mountain Card", price: "$530" },
          { name: "Regular 6-Day Stark Mountain Card", price: "$530" },
          { name: "Junior tickets, about 6 days", price: "$600", estimated: true },
        ],
        ...customerPair(1759.6, 1197.8),
      },
      {
        label: "Mostly weekday skiing",
        kind: "alternative",
        assumption: "Monday through Friday, including holidays. Qualifying adult season passes can include free kids passes if registered by September 30.",
        buy: [
          { name: "Adult Midweek Pass", price: "$479" },
          { name: "Adult Midweek Pass", price: "$479" },
        ],
        comparedWith: [
          { name: "Regular 6-Day Stark Mountain Card", price: "$530" },
          { name: "Regular 6-Day Stark Mountain Card", price: "$530" },
          { name: "Junior tickets, about 6 days", price: "$600", estimated: true },
        ],
        ...customerPair(1759.6, 1015.48),
      },
    ],
    sourceCheckedNote: "Details checked Sep 7, 2026.",
  };
}

function gearScenarios(): {
  facts: string[];
  assumptions: string[];
  scenarios: OpportunityScenario[];
} {
  return {
    facts: [
      "Bolton Valley passholders get 20% off eligible on-mountain retail.",
    ],
    assumptions: [
      "No specific gear purchase was named, so counted savings are $0.",
    ],
    scenarios: [
      {
        label: "If you bought $375 of eligible gear",
        kind: "assumption",
        assumption: "Example only. 20% of $375 is $75.",
        ...customerPair(375, 300),
      },
    ],
  };
}

function detailsFor(
  opportunity: ResearchOpportunity,
): Pick<DisplayOpportunity, "facts" | "assumptions" | "scenarios" | "sourceCheckedNote"> {
  // Display overlays for known saved-research opportunity IDs. Other families use
  // generic cost pairs from the research JSON. This is not customer-facing voice.
  if (opportunity.id === "cochrans-reduced-family-pass-2627") {
    return cochransScenarios();
  }
  if (opportunity.id === "mrg-family-access-strategy-2627") {
    return madRiverScenarios();
  }
  if (opportunity.id === "bolton-passholder-retail-gear-2627") {
    return gearScenarios();
  }
  if (opportunity.id === "ski-vermont-4pass-2627") {
    return {
      facts: [
        "Ski Vermont 4Pass 2026/27 enter-to-purchase window had not been announced as of September 7, 2026.",
        "Published price is $220 plus tax. Randomized selection. 48 hours to buy if chosen.",
      ],
      assumptions: [
        "Savings depend on which four resorts they'd actually visit, and on not using vouchers for days already covered.",
      ],
      scenarios: genericScenarios(opportunity),
      sourceCheckedNote: "Details checked Sep 7, 2026.",
    };
  }
  return {
    facts: [],
    assumptions: [],
    scenarios: genericScenarios(opportunity),
  };
}

export function summarizeDisplaySavings(research: CanonicalResearch): DisplaySavingsSummary {
  const unique = countableLedgerOpportunities(research.opportunities);
  const opportunities = unique.map((opportunity) => {
    const tier = displayTierFor(opportunity);
    const firm = isFirmlyCountable(opportunity, research);
    const kind = countKindFor(opportunity, research, tier);
    return {
      opportunity,
      tier,
      firm,
      kind,
      ...detailsFor(opportunity),
    };
  });

  const counts: OpportunityTierCounts = {
    jackpotCount: 0,
    strongCount: 0,
    usefulCount: 0,
    watchCount: 0,
  };
  for (const item of opportunities) {
    counts[TIER_KEY[item.tier]] += 1;
  }

  const firmItems = opportunities.filter((item) => item.firm);
  const firmLow = roundCents(
    firmItems.reduce((sum, item) => sum + item.opportunity.netSavingsLow, 0),
  );
  const firmHigh = roundCents(
    firmItems.reduce((sum, item) => sum + item.opportunity.netSavingsHigh, 0),
  );

  const conditionalItems = opportunities.filter(
    (item) => !item.firm && item.kind !== "watch" && item.opportunity.netSavingsLow > 0,
  );
  const conditionalLow = roundCents(
    conditionalItems.reduce((sum, item) => sum + item.opportunity.netSavingsLow, 0),
  );
  const conditionalHigh = roundCents(
    conditionalItems.reduce((sum, item) => sum + item.opportunity.netSavingsHigh, 0),
  );

  const offer = decideOfferMode({
    coreSavingsLow: firmLow,
    confidence: research.summary.confidence,
    countableOpportunityCount: firmItems.length,
    compellingMin: COMPELLING_SAVINGS_MIN,
  });

  return {
    firmLow,
    firmHigh,
    conditionalLow,
    conditionalHigh,
    offer,
    counts,
    headlineSavings: formatCustomerRange(firmLow, firmHigh),
    conditionalSavings:
      conditionalLow > 0 || conditionalHigh > 0
        ? formatCustomerRange(conditionalLow, conditionalHigh)
        : undefined,
    opportunities,
  };
}

export { formatCustomerRange };
