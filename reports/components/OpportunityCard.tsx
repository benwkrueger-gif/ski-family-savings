import type { Opportunity } from "../schema";
import { collectSources } from "../schema";
import { TIERS, type TierKey } from "../tiers";
import { RecommendedAction } from "./RecommendedAction";
import { ScenarioComparison } from "./ScenarioComparison";
import { SavingsMath } from "./SavingsMath";
import { SavingsTierBadge } from "./SavingsTierBadge";
import { SourceLinks } from "./SourceLinks";

type OpportunityCardProps = {
  opportunity: Opportunity;
};

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="opp-section">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-[13px] leading-snug text-dark">{children}</p>
    </div>
  );
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const tier = opportunity.tier as TierKey;
  const meta = TIERS[tier];
  const jackpot = tier === "jackpot";
  const scenarios = (opportunity.scenarios ?? []).filter(
    (scenario) => scenario.baseline || scenario.optimized || scenario.savings,
  );
  const found = opportunity.found;
  const action = opportunity.action || opportunity.recommendedAction;
  const compact = opportunity.tier === "watch";

  return (
    <article className="overflow-hidden rounded-[4px] border border-border bg-background">
      <div className="flex">
        <span className={`w-1.5 shrink-0 ${meta.barClass}`} />
        <div className="min-w-0 flex-1">
          <div className={jackpot ? "bg-dark px-5 py-3.5" : "px-5 pt-3.5"}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <SavingsTierBadge tier={tier} size="compact" />
                <h3
                  className={`mt-1.5 font-display font-bold leading-[0.95] tracking-[-0.02em] ${
                    jackpot ? "text-white" : "text-dark"
                  } ${compact ? "text-[1.15rem]" : "text-[1.3rem]"}`}
                >
                  {opportunity.title}
                </h3>
                {opportunity.kindLabel || opportunity.location ? (
                  <p className={`mt-1.5 text-xs ${jackpot ? "text-white/70" : "text-muted"}`}>
                    {[opportunity.kindLabel, opportunity.location].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </div>
              {opportunity.potentialSavings ? (
                <p
                  className={`shrink-0 pt-4 font-display font-bold leading-none tracking-[-0.04em] ${
                    jackpot ? "text-accent" : "text-dark"
                  } ${compact ? "text-[1.25rem]" : "text-[1.45rem]"}`}
                >
                  {opportunity.potentialSavings}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 px-5 py-3">
            <Block label="What I found">{found}</Block>
            <Block label="What it could save">{opportunity.saveNote}</Block>

            {scenarios.length > 0 ? (
              scenarios.some((scenario) => (scenario.buy?.length ?? 0) > 0) ? (
                <ScenarioComparison scenarios={scenarios} />
              ) : (
                <div className="space-y-2.5">
                  {scenarios.map((scenario) => (
                    <div key={scenario.label} className="rounded-[4px] border border-border px-3 py-2.5">
                      <p className="font-display text-[13px] font-bold leading-snug text-dark">{scenario.label}</p>
                      {scenario.assumption ? (
                        <p className="mt-1 text-[12px] leading-snug text-muted">{scenario.assumption}</p>
                      ) : null}
                      <div className="mt-2">
                        <SavingsMath
                          math={{
                            normalCost: scenario.baseline,
                            optimizedCost: scenario.optimized,
                            estimatedSavings: scenario.savings,
                          }}
                          heading={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <SavingsMath math={opportunity.math} />
            )}

            <Block label="The catch">{opportunity.catchNote}</Block>
            <Block label="Timing">{opportunity.deadline}</Block>

            <div className="opp-section space-y-2">
              <RecommendedAction action={action} label="What you'd need to do" />
              <SourceLinks sources={collectSources(opportunity.source, opportunity.sources)} />
              {opportunity.sourceCheckedLabel ? (
                <p className="text-[11px] text-muted">{opportunity.sourceCheckedLabel}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
