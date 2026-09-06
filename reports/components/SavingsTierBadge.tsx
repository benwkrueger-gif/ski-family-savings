import { TIERS, type TierKey } from "../tiers";

type SavingsTierBadgeProps = {
  tier: TierKey;
  size?: "default" | "compact";
};

export function SavingsTierBadge({ tier, size = "default" }: SavingsTierBadgeProps) {
  const meta = TIERS[tier];
  const compact = size === "compact";

  return (
    <p
      className={`font-display font-bold tracking-wide text-dark ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      <span className="mr-1.5">{meta.emoji}</span>
      {meta.labelCaps}
    </p>
  );
}
