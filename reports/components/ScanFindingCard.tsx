import type { ReportData } from "../schema";
import { SavingsTierBadge } from "./SavingsTierBadge";
import type { TierKey } from "../tiers";

type ScanFinding = NonNullable<ReportData["freeScan"]>["findings"][number];

export function ScanFindingCard({ finding }: { finding: ScanFinding }) {
  return (
    <article className="avoid-break overflow-hidden rounded-[4px] border border-border bg-background">
      <div className="flex">
        <span
          className={`w-1.5 shrink-0 ${
            finding.tier === "jackpot"
              ? "bg-accent"
              : finding.tier === "strong"
                ? "bg-accent-blue"
                : finding.tier === "useful"
                  ? "bg-[#6a6c69]"
                  : "bg-border"
          }`}
        />
        <div className="min-w-0 flex-1 px-3.5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SavingsTierBadge tier={finding.tier as TierKey} size="compact" />
              <h3 className="mt-1.5 font-display text-[1.2rem] font-bold leading-[1.05] tracking-[-0.02em] text-dark">
                {finding.heading}
              </h3>
            </div>
            {finding.savings ? (
              <p className="shrink-0 pt-4 font-display text-[1.15rem] font-bold leading-none tracking-[-0.03em] text-dark">
                {finding.savings}
              </p>
            ) : null}
          </div>
          <p className="mt-1.5 text-[12px] leading-snug text-muted">{finding.explanation}</p>
        </div>
      </div>
    </article>
  );
}
