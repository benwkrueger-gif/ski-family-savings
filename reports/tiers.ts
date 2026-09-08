export const TIERS = {
  jackpot: {
    key: "jackpot" as const,
    emoji: "🔥",
    label: "Jackpot",
    labelCaps: "JACKPOT",
    barClass: "bg-accent",
    detail: "$250+ from one decision",
  },
  strong: {
    key: "strong" as const,
    emoji: "🟢",
    label: "Strong",
    labelCaps: "STRONG",
    barClass: "bg-accent-blue",
    detail: "$50-$249",
  },
  useful: {
    key: "useful" as const,
    emoji: "🟡",
    label: "Useful",
    labelCaps: "USEFUL",
    barClass: "bg-[#6a6c69]",
    detail: "Under $50",
  },
  watch: {
    key: "watch" as const,
    emoji: "🔔",
    label: "Watch",
    labelCaps: "WATCH",
    barClass: "bg-border",
    detail: "Useful later, not counted yet",
  },
};

export type TierKey = keyof typeof TIERS;
