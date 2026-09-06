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
      <p className="eyebrow">{strategy?.headline ?? "What I'd do"}</p>
      <h2 className="mt-3 font-display text-4xl font-bold leading-[0.95] tracking-[-0.02em] text-dark">
        A short list. Then go ski.
      </h2>
      <ol className="mt-6 space-y-5">
        {steps.map((step) => (
          <li key={step.number} className="opp-section flex gap-5">
            <p className="font-display text-5xl font-bold leading-none text-accent">{step.number}</p>
            <div className="pt-1">
              <h3 className="font-display text-xl font-bold tracking-tight text-dark">{step.title}</h3>
              {step.description ? (
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.description}</p>
              ) : null}
              {step.source ? (
                <div className="mt-2">
                  <SourceLink source={step.source} />
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {closingLine ? (
        <p className="mt-8 font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark">
          {closingLine}
        </p>
      ) : null}
      {referralLine ? (
        <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">{referralLine}</p>
      ) : null}
    </section>
  );
}
