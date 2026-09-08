import type { ReportData } from "../schema";
import { SourceLink } from "./SourceLink";

type ActionPlanProps = {
  strategy?: ReportData["strategy"];
  closingLine?: string;
  referralLine?: string;
};

export function ActionPlan({ strategy, closingLine, referralLine }: ActionPlanProps) {
  const steps = strategy?.steps ?? [];
  if (steps.length === 0) return null;

  return (
    <section>
      <p className="eyebrow">{strategy?.headline ?? "Here's where I'd start"}</p>
      {strategy?.intro ? (
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{strategy.intro}</p>
      ) : null}
      <ol className="mt-3 space-y-3">
        {steps.map((step) => (
          <li key={step.number} className="opp-section flex gap-4">
            <p className="font-display text-3xl font-bold leading-none text-accent">{step.number}</p>
            <div className="pt-1">
              <h3 className="font-display text-lg font-bold tracking-tight text-dark">{step.title}</h3>
              {step.description ? (
                <p className="mt-1 text-[13px] leading-snug text-muted">{step.description}</p>
              ) : null}
              {step.source ? (
                <div className="mt-1.5">
                  <SourceLink source={step.source} />
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {closingLine ? (
        <div className="mt-5">
          <p className="eyebrow">My take</p>
          <p className="mt-2 font-display text-xl font-bold leading-snug tracking-[-0.02em] text-dark">
            {closingLine}
          </p>
        </div>
      ) : null}
      {referralLine ? (
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">{referralLine}</p>
      ) : null}
    </section>
  );
}
