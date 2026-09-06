import { TIERS } from "../tiers";

type SavingsScorecardProps = {
  jackpotCount: number;
  strongCount: number;
  usefulCount: number;
  watchCount: number;
  layout?: "rows" | "grid";
  compact?: boolean;
};

export function SavingsScorecard({
  jackpotCount,
  strongCount,
  usefulCount,
  watchCount,
  layout = "grid",
  compact = false,
}: SavingsScorecardProps) {
  const items = [
    { ...TIERS.jackpot, count: jackpotCount },
    { ...TIERS.strong, count: strongCount },
    { ...TIERS.useful, count: usefulCount },
    { ...TIERS.watch, count: watchCount },
  ];

  if (layout === "rows") {
    return (
      <div className="overflow-hidden rounded-[4px] border border-border bg-background">
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div key={item.key} className={`flex gap-4 ${compact ? "px-4 py-2.5" : "px-5 py-4"}`}>
              <span className={`mt-1 w-1.5 shrink-0 ${item.barClass}`} />
              <div>
                <p className="font-display font-bold text-dark">
                  {item.emoji} {item.count} {item.label} {item.count === 1 ? "opportunity" : "opportunities"}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[4px] border border-border bg-background">
      <div className="grid grid-cols-4 divide-x divide-border">
        {items.map((item) => (
          <div key={item.key} className={compact ? "px-2.5 py-3 text-center" : "px-3 py-4 text-center"}>
            <span className={`mx-auto mb-2 block h-1 w-8 ${item.barClass}`} />
            <p className={`font-display font-bold leading-none text-dark ${compact ? "text-2xl" : "text-3xl"}`}>
              {item.emoji} {item.count}
            </p>
            <p className="mt-1.5 font-display text-[10px] font-bold tracking-[0.08em] text-muted">
              {item.labelCaps}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
