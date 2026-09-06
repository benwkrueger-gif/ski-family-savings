import type { Opportunity } from "../schema";

type SavingsMathProps = {
  math?: Opportunity["math"];
};

export function SavingsMath({ math }: SavingsMathProps) {
  if (!math) return null;

  const rows = [
    { label: "Normal cost", value: math.normalCost },
    { label: "Optimized cost", value: math.optimizedCost },
    { label: "Estimated savings", value: math.estimatedSavings, emphasize: true },
  ].filter((row) => row.value);

  if (rows.length === 0) return null;

  return (
    <div>
      <p className="eyebrow">The math</p>
      <div className="mt-2 divide-y divide-border border-y border-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 py-1.5">
            <p className={`text-[13px] ${row.emphasize ? "font-semibold text-dark" : "text-muted"}`}>
              {row.label}
            </p>
            <p
              className={`font-display font-bold tracking-tight ${
                row.emphasize ? "text-base text-dark" : "text-sm text-dark"
              }`}
            >
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
