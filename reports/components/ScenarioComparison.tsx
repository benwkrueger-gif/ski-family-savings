import type { Opportunity } from "../schema";

type Scenario = NonNullable<Opportunity["scenarios"]>[number];
type Product = NonNullable<Scenario["buy"]>[number];

function productLine(items: Product[] | undefined): string {
  if (!items?.length) return "—";
  return items
    .map((item) => `${item.name} (${item.estimated ? "est. " : ""}${item.price})`)
    .join(" + ");
}

function priceLine(items: Product[] | undefined): string {
  if (!items?.length) return "—";
  const hasEstimate = items.some((item) => item.estimated);
  const prices = items.map((item) => (item.estimated ? `est. ${item.price}` : item.price)).join(" + ");
  return hasEstimate ? `${prices} *` : prices;
}

export function ScenarioComparison({ scenarios }: { scenarios: Scenario[] }) {
  if (scenarios.length === 0) return null;
  const hasProducts = scenarios.some((scenario) => (scenario.buy?.length ?? 0) > 0);
  if (!hasProducts) return null;

  return (
    <div className="overflow-hidden rounded-[4px] border border-border">
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="bg-subtle">
            <th className="w-[22%] px-2 py-2 font-display text-[11px] font-bold text-muted"> </th>
            {scenarios.map((scenario) => (
              <th key={scenario.label} className="px-2 py-2 font-display text-[12px] font-bold leading-snug text-dark">
                {scenario.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-[11px] leading-snug text-dark">
          <tr className="border-t border-border align-top">
            <td className="px-2 py-2 text-muted">What you&apos;d buy</td>
            {scenarios.map((scenario) => (
              <td key={`${scenario.label}-buy`} className="px-2 py-2">
                {productLine(scenario.buy)}
              </td>
            ))}
          </tr>
          <tr className="border-t border-border align-top">
            <td className="px-2 py-2 text-muted">Official prices</td>
            {scenarios.map((scenario) => (
              <td key={`${scenario.label}-prices`} className="px-2 py-2">
                {priceLine(scenario.buy)}
              </td>
            ))}
          </tr>
          <tr className="border-t border-border">
            <td className="px-2 py-2 text-muted">Family total, with tax</td>
            {scenarios.map((scenario) => (
              <td key={`${scenario.label}-opt`} className="px-2 py-2 font-display font-bold">
                {scenario.optimized ?? "—"}
              </td>
            ))}
          </tr>
          <tr className="border-t border-border align-top">
            <td className="px-2 py-2 text-muted">Compared with</td>
            {scenarios.map((scenario) => (
              <td key={`${scenario.label}-vs`} className="px-2 py-2">
                {priceLine(scenario.comparedWith)}
              </td>
            ))}
          </tr>
          <tr className="border-t border-border">
            <td className="px-2 py-2 text-muted">That total, with tax</td>
            {scenarios.map((scenario) => (
              <td key={`${scenario.label}-base`} className="px-2 py-2">
                {scenario.baseline ?? "—"}
              </td>
            ))}
          </tr>
          <tr className="border-t border-border">
            <td className="px-2 py-2 text-muted">Saves</td>
            {scenarios.map((scenario) => (
              <td key={`${scenario.label}-save`} className="px-2 py-2 font-display font-bold">
                {scenario.savings ?? "—"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="border-t border-border px-2 py-2 text-[11px] leading-snug text-muted">
        Official pass prices are before 6% Vermont tax. Totals include tax. * Junior tickets are an estimate, not an
        official 2026/27 window price. These are alternatives, so pick one.
      </p>
      {scenarios.some((scenario) => scenario.assumption) ? (
        <div className="space-y-1 border-t border-border px-2 py-2">
          {scenarios.map((scenario) =>
            scenario.assumption ? (
              <p key={`${scenario.label}-note`} className="text-[11px] leading-snug text-muted">
                <span className="font-semibold text-dark">{scenario.label}:</span> {scenario.assumption}
              </p>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}
