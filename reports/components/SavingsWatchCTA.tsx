import type { ReportAssets } from "../assets";
import type { ReportData } from "../schema";
import { CheckIcon } from "./CheckIcon";
import { ReportCta } from "./ReportCta";

type SavingsWatchCTAProps = {
  monitoring?: ReportData["monitoring"];
  assets: ReportAssets;
};

export function SavingsWatchCTA({ monitoring, assets }: SavingsWatchCTAProps) {
  if (!monitoring?.enabled) return null;

  const bullets = monitoring.bullets ?? [];

  return (
    <section className="avoid-break relative overflow-hidden">
      <img
        src={assets.ctaFamily}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-dark/80" />
      <div className="relative px-7 py-8 text-white">
        <p className="font-display text-xs font-bold tracking-[0.08em] text-accent">Ski Savings Watch</p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em]">
          {monitoring.title ?? "Don't want to keep track of all this?"}
        </h2>
        {monitoring.body ? (
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/85">{monitoring.body}</p>
        ) : null}
        {bullets.length > 0 ? (
          <ul className="mt-5 space-y-2">
            {bullets.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] font-semibold leading-snug">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {monitoring.principle ? (
          <p className="mt-6 font-semibold text-white">{monitoring.principle}</p>
        ) : null}
        <div className="mt-8 flex flex-wrap items-end gap-10">
          {monitoring.price ? (
            <div>
              <p className="font-display text-[11px] font-bold tracking-[0.08em] text-white/70">
                {monitoring.addOnLabel ?? "Add Savings Watch"}
              </p>
              <p className="mt-1 font-display text-4xl font-bold leading-none tracking-[-0.04em] text-accent">
                +{monitoring.price}
              </p>
            </div>
          ) : null}
          {monitoring.combinedFirstSeasonPrice ? (
            <div>
              <p className="font-display text-[11px] font-bold tracking-[0.08em] text-white/70">
                {monitoring.combinedLabel ?? "Full report + first season of Watch"}
              </p>
              <p className="mt-1 font-display text-4xl font-bold leading-none tracking-[-0.04em] text-white">
                {monitoring.combinedFirstSeasonPrice} total
              </p>
            </div>
          ) : null}
        </div>
        <div className="mt-6">
          <ReportCta href={monitoring.combinedUrl || monitoring.url}>Keep watching →</ReportCta>
        </div>
      </div>
    </section>
  );
}
