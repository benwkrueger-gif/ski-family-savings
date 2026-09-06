import type { ReportData } from "../schema";

type OpportunityAreaCardsProps = {
  areas: NonNullable<ReportData["freeScan"]>["opportunityAreas"];
};

export function OpportunityAreaCards({ areas }: OpportunityAreaCardsProps) {
  if (!areas.length) return null;

  return (
    <div className="grid grid-cols-3 gap-3">
      {areas.map((area, index) => (
        <article
          key={area.label}
          className="rounded-[4px] border border-border bg-background px-3.5 py-3.5"
        >
          {index === 0 ? <div className="rule-gold mb-2.5" /> : <div className="mb-2.5 h-1" />}
          <p className="eyebrow">{area.label}</p>
          <p className="mt-2 text-[12px] leading-snug text-muted">{area.teaser}</p>
        </article>
      ))}
    </div>
  );
}
