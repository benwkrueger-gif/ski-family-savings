import type { ReportAssets } from "../assets";
import type { ReportData } from "../schema";
import { BiggestWin } from "../components/BiggestWin";
import { CheckIcon } from "../components/CheckIcon";
import { OpportunityAreaCards } from "../components/OpportunityAreaCards";
import { ReportBrandHeader } from "../components/ReportBrandHeader";
import { ReportCta } from "../components/ReportCta";
import { ReportFooter } from "../components/ReportFooter";
import { SavingsHero } from "../components/SavingsHero";
import { SavingsScorecard } from "../components/SavingsScorecard";
import { TrustCallout } from "../components/TrustCallout";

type FreeScanReportProps = {
  data: ReportData;
  assets: ReportAssets;
};

export function FreeScanReport({ data, assets }: FreeScanReportProps) {
  const free = data.freeScan;
  const areas = free?.opportunityAreas ?? [];
  const unknowns = free?.importantUnknowns ?? [];
  const cta = free?.cta;
  const ctaBullets = cta?.bullets ?? [];

  return (
    <div className="report-root">
      <article className="report-page-single flex flex-col">
        <ReportBrandHeader
          generatedDate={data.report.generatedDate}
          reportId={data.report.reportId}
        />

        <p className="eyebrow mt-4">Your family&apos;s savings scan</p>
        <h1 className="mt-2 font-display text-[1.85rem] font-bold leading-[0.95] tracking-[-0.02em] text-dark">
          {data.summary.headline}
        </h1>

        <div className="mt-4 overflow-hidden rounded-[4px] border border-border">
          <SavingsHero amount={data.summary.headlineSavings} compact />
          <SavingsScorecard
            jackpotCount={data.summary.jackpotCount}
            strongCount={data.summary.strongCount}
            usefulCount={data.summary.usefulCount}
            watchCount={data.summary.watchCount}
            compact
          />
        </div>

        {areas.length > 0 ? (
          <section className="mt-4">
            <p className="eyebrow">Where the money appears to be hiding</p>
            <div className="mt-2.5">
              <OpportunityAreaCards areas={areas} />
            </div>
          </section>
        ) : null}

        {(free?.biggestPotentialWin || unknowns.length > 0) && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="overflow-hidden rounded-[4px] border border-border">
              <BiggestWin
                amount={free?.biggestPotentialWin}
                label={free?.biggestPotentialWinLabel}
              />
            </div>
            {unknowns.length > 0 ? (
              <div className="rounded-[4px] border border-border bg-subtle px-4 py-3.5">
                <p className="eyebrow">What could move this number?</p>
                <p className="mt-2 text-[12px] leading-snug text-muted">
                  {free?.unknownsIntro ?? "To tighten this estimate, I'd want to confirm:"}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {unknowns.map((item) => (
                    <li key={item} className="flex gap-2 text-[12px] leading-snug text-dark">
                      <span className="mt-1.5 h-1 w-1 shrink-0 bg-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div />
            )}
          </div>
        )}

        <div className="mt-4">
          <TrustCallout
            title={data.methodology?.title}
            text={data.methodology?.text}
            compact
          />
        </div>

        {cta ? (
          <section className="relative mt-4 overflow-hidden rounded-[4px]">
            <img
              src={assets.ctaFamily}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-dark/80" />
            <div className="relative grid grid-cols-[1.2fr_0.8fr] gap-4 px-5 py-4 text-white">
              <div>
                <h2 className="font-display text-[1.45rem] font-bold leading-[0.95] tracking-[-0.02em]">
                  {cta.headline}
                </h2>
                {cta.body ? (
                  <p className="mt-2 text-[12px] leading-snug text-white/85">{cta.body}</p>
                ) : null}
                {ctaBullets.length > 0 ? (
                  <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1">
                    {ctaBullets.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[11px] font-semibold leading-snug">
                        <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="flex flex-col items-start justify-center">
                {cta.price ? (
                  <p className="font-display text-4xl font-bold leading-none tracking-[-0.04em] text-accent">
                    {cta.price}
                  </p>
                ) : null}
                <div className="mt-3">
                  <ReportCta href={cta.url} className="px-5 py-3 text-sm">
                    {cta.buttonLabel ?? "Unlock my Savings Plan →"}
                  </ReportCta>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <div className="mt-auto">
          <div className="-mx-[0.44in] mt-4">
            <ReportFooter compact />
          </div>
        </div>
      </article>
    </div>
  );
}
