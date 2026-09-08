import type { Opportunity } from "../schema";

type SavingsMathProps = {
  math?: Opportunity["math"];
  heading?: boolean;
};

export function SavingsMath({ math, heading = true }: SavingsMathProps) {
  if (!math) return null;

  const rows = [
    { label: "Normal cost", value: math.normalCost },
    { label: "With this option", value: math.optimizedCost },
    { label: "Saves", value: math.estimatedSavings, emphasize: true },
  ].filter((row) => row.value);

  if (rows.length === 0) return null;

  return (
    <div>
      {heading ? <p className="eyebrow">The math</p> : null}
      <div className={`${heading ? "mt-2" : ""} divide-y divide-border border-y border-border`}>
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
