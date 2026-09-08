import type { ReportAssets } from "../assets";
import type { ReportData } from "../schema";

type PersonalThankYouProps = {
  thankYou?: ReportData["thankYou"];
  assets: ReportAssets;
};

export function PersonalThankYou({ thankYou, assets }: PersonalThankYouProps) {
  if (!thankYou?.enabled) return null;

  return (
    <section className="flex items-start gap-5">
      <div className="relative aspect-[4/5] w-[1.25in] shrink-0 overflow-hidden rounded-[4px] bg-subtle">
        <img
          src={assets.founder}
          alt="Dad and toddler in the snow"
          className="absolute inset-0 h-full w-full object-cover object-[center_22%]"
        />
      </div>
      <div className="pt-2">
        <div className="rule-gold mb-3" />
        <h2 className="max-w-sm font-display text-[1.45rem] font-bold leading-[0.95] tracking-[-0.02em] text-dark">
          {thankYou.headline ?? "Thanks for testing this out."}
        </h2>
          {thankYou.body ? (
            <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-muted">{thankYou.body}</p>
          ) : null}
          <p className="mt-4 font-display text-sm font-bold tracking-wide text-dark">Ben</p>
        <p className="mt-0.5 text-[12px] text-muted">Ski Family Savings</p>
      </div>
    </section>
  );
}
