import type { ReportAssets } from "../assets";
import type { ReportData } from "../schema";
import { MyTake } from "../components/MyTake";
import { ReportBrandHeader } from "../components/ReportBrandHeader";
import { ReportCta } from "../components/ReportCta";
import { ReportFooter } from "../components/ReportFooter";
import { SavingsHero } from "../components/SavingsHero";
import { SavingsScorecard } from "../components/SavingsScorecard";
import { ScanFindingCard } from "../components/ScanFindingCard";

type FreeScanReportProps = {
  data: ReportData;
  assets?: ReportAssets;
};

export function FreeScanReport({ data }: FreeScanReportProps) {
  const free = data.freeScan;
  const findings = free?.findings ?? [];
  const unknowns = free?.importantUnknowns ?? [];
  const cta = free?.cta;
  const firmHeadline = data.summary.headlineKind !== "conditional";
  const page1Findings = findings.slice(0, 2);
  const page2Findings = findings.slice(2);

  return (
    <div className="report-root report-scan">
      <section className="report-page-single flex flex-col">
        <ReportBrandHeader
          generatedDate={data.report.generatedDate}
          preparedFor={free?.preparedFor ?? data.family.firstName}
        />

        {free?.opening ? (
          <div className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-dark">{free.opening}</div>
        ) : null}

        {free?.savingsLine ? (
          <p className="mt-3.5 font-display text-[1.15rem] font-bold leading-snug tracking-[-0.02em] text-dark">
            {free.savingsLine}
          </p>
        ) : null}

        <div className="mt-3 overflow-hidden rounded-[4px] border border-border">
          {firmHeadline ? (
            <SavingsHero amount={data.summary.headlineSavings} caption="counted savings" compact />
          ) : null}
          <SavingsScorecard
            jackpotCount={data.summary.jackpotCount}
            strongCount={data.summary.strongCount}
            usefulCount={data.summary.usefulCount}
            watchCount={data.summary.watchCount}
            compact
          />
        </div>

        {page1Findings.length > 0 ? (
          <section className="mt-4">
            <p className="eyebrow">Here&apos;s what I found</p>
            <div className="mt-2 space-y-2.5">
              {page1Findings.map((finding) => (
                <ScanFindingCard key={finding.heading} finding={finding} />
              ))}
            </div>
          </section>
        ) : null}
      </section>

      <section className="report-page-single flex flex-col">
        {page2Findings.length > 0 ? (
          <div className="space-y-2.5">
            {page2Findings.map((finding) => (
              <ScanFindingCard key={finding.heading} finding={finding} />
            ))}
          </div>
        ) : null}

        <div className={page2Findings.length > 0 ? "mt-4" : ""}>
          <MyTake text={free?.myTake} heading="My take" />
        </div>

        {unknowns.length > 0 ? (
          <section className="mt-4 rounded-[4px] border border-border bg-background px-4 py-3">
            <p className="eyebrow">{free?.unknownsHeading ?? "A couple things to check"}</p>
            <ul className="mt-2 space-y-1.5">
              {unknowns.map((item) => (
                <li key={item} className="flex gap-2 text-[13px] leading-snug text-dark">
                  <span className="mt-1.5 h-1 w-1 shrink-0 bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {cta ? (
          <section className="mt-4 rounded-[4px] border border-border bg-subtle px-4 py-3.5">
            <p className="font-display text-[1.25rem] font-bold leading-[1.05] tracking-[-0.02em] text-dark">
              {cta.headline}
            </p>
            {cta.body ? (
              <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-muted">{cta.body}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <ReportCta href={cta.url} className="px-5 py-3 text-sm">
                {cta.buttonLabel ?? "Get the Savings Plan"}
              </ReportCta>
              {cta.price ? <p className="text-[13px] font-semibold text-dark">{cta.price}</p> : null}
            </div>
          </section>
        ) : null}

        {free?.closing ? (
          <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-dark">{free.closing}</p>
        ) : null}

        <div className="-mx-[0.44in] mt-auto">
          <ReportFooter compact />
        </div>
      </section>
    </div>
  );
}
