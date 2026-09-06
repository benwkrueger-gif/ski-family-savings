import type { Opportunity } from "../schema";
import { collectSources } from "../schema";
import { TIERS, type TierKey } from "../tiers";
import { RecommendedAction } from "./RecommendedAction";
import { SavingsMath } from "./SavingsMath";
import { SavingsTierBadge } from "./SavingsTierBadge";
import { SourceLinks } from "./SourceLinks";

type OpportunityCardProps = {
  opportunity: Opportunity;
};

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="opp-section">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-[12.5px] leading-snug text-muted">{children}</p>
    </div>
  );
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const tier = opportunity.tier as TierKey;
  const meta = TIERS[tier];
  const jackpot = tier === "jackpot";
  const restrictions = opportunity.restrictions ?? [];
  const hasMeta = Boolean(opportunity.location || opportunity.confidence);

  return (
    <article className="overflow-hidden rounded-[4px] border border-border bg-background">
      <div className="flex">
        <span className={`w-1.5 shrink-0 ${meta.barClass}`} />
        <div className="min-w-0 flex-1">
          <div className={jackpot ? "bg-dark px-5 py-4" : "px-5 pt-4"}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <SavingsTierBadge tier={tier} size="compact" />
                <h3
                  className={`mt-2 font-display text-[1.35rem] font-bold leading-[0.95] tracking-[-0.02em] ${
                    jackpot ? "text-white" : "text-dark"
                  }`}
                >
                  {opportunity.title}
                </h3>
                {hasMeta ? (
                  <p className={`mt-1.5 text-xs ${jackpot ? "text-white/70" : "text-muted"}`}>
                    {[opportunity.location, opportunity.confidence ? `${opportunity.confidence} confidence` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
              {opportunity.potentialSavings ? (
                <p
                  className={`shrink-0 pt-5 font-display text-[1.65rem] font-bold leading-none tracking-[-0.04em] ${
                    jackpot ? "text-accent" : "text-dark"
                  }`}
                >
                  {opportunity.potentialSavings}
                </p>
              ) : null}
            </div>
          </div>

            <div className="space-y-3 px-5 py-3.5">
            {opportunity.whyItMatters && opportunity.whyYouQualify ? (
              <div className="grid grid-cols-2 gap-5">
                <Block label="Why this matters">{opportunity.whyItMatters}</Block>
                <Block label="Why your family qualifies">{opportunity.whyYouQualify}</Block>
              </div>
            ) : (
              <>
                {opportunity.whyItMatters ? (
                  <Block label="Why this matters">{opportunity.whyItMatters}</Block>
                ) : null}
                {opportunity.whyYouQualify ? (
                  <Block label="Why your family qualifies">{opportunity.whyYouQualify}</Block>
                ) : null}
              </>
            )}
            {opportunity.howItWorks ? (
              <Block label="How it works">{opportunity.howItWorks}</Block>
            ) : null}

            {(() => {
              const hasMath = Boolean(
                opportunity.math?.normalCost ||
                  opportunity.math?.optimizedCost ||
                  opportunity.math?.estimatedSavings,
              );
              const gotchas = (
                <div className="space-y-3">
                  {opportunity.deadline ? (
                    <Block label="Deadline">{opportunity.deadline}</Block>
                  ) : null}
                  {restrictions.length > 0 ? (
                    <div className="opp-section">
                      <p className="eyebrow">Gotchas</p>
                      <ul className="mt-1.5 space-y-1">
                        {restrictions.map((item) => (
                          <li key={item} className="flex gap-2 text-[12px] leading-snug text-muted">
                            <span className="mt-1.5 h-1 w-1 shrink-0 bg-accent" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
              const hasGotchas = Boolean(opportunity.deadline || restrictions.length > 0);

              if (hasMath && hasGotchas) {
                return (
                  <div className="grid grid-cols-2 gap-5">
                    <SavingsMath math={opportunity.math} />
                    {gotchas}
                  </div>
                );
              }

              return (
                <>
                  <SavingsMath math={opportunity.math} />
                  {hasGotchas ? gotchas : null}
                </>
              );
            })()}

            <div className="opp-section space-y-3">
              <RecommendedAction action={opportunity.recommendedAction} />
              <SourceLinks sources={collectSources(opportunity.source, opportunity.sources)} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
