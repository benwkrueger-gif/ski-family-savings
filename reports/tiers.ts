export const TIERS = {
  jackpot: {
    key: "jackpot" as const,
    emoji: "🔥",
    label: "Jackpot",
    labelCaps: "JACKPOT",
    barClass: "bg-accent",
    detail: "Likely savings of $250+ each",
  },
  strong: {
    key: "strong" as const,
    emoji: "🟢",
    label: "Strong",
    labelCaps: "STRONG",
    barClass: "bg-accent-blue",
    detail: "Likely savings of $50–$250",
  },
  useful: {
    key: "useful" as const,
    emoji: "🟡",
    label: "Useful",
    labelCaps: "USEFUL",
    barClass: "bg-[#6a6c69]",
    detail: "Smaller or more situational savings",
  },
  watch: {
    key: "watch" as const,
    emoji: "🔔",
    label: "Watch",
    labelCaps: "WATCH",
    barClass: "bg-border",
    detail: "Not counted yet — worth keeping an eye on",
  },
};

export type TierKey = keyof typeof TIERS;
