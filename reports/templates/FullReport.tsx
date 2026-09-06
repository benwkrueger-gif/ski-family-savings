import type { ReportAssets } from "../assets";
import type { ReportData } from "../schema";
import { ActionPlan } from "../components/ActionPlan";
import { GoldRule } from "../components/GoldRule";
import { KnownSavingsCard } from "../components/KnownSavingsCard";
import { OpportunityCard } from "../components/OpportunityCard";
import { PersonalThankYou } from "../components/PersonalThankYou";
import { ReportBrandHeader } from "../components/ReportBrandHeader";
import { ReportCover } from "../components/ReportCover";
import { ReportFooter } from "../components/ReportFooter";
import { SavingsMap } from "../components/SavingsMap";
import { SourceLink } from "../components/SourceLink";
import { TrustCallout } from "../components/TrustCallout";
import { WatchCard } from "../components/WatchCard";
import { destinationLine } from "../family-line";

type FullReportProps = {
  data: ReportData;
  assets: ReportAssets;
};

export function FullReport({ data, assets }: FullReportProps) {
  const discovered = data.opportunities.filter((item) => item.tier !== "watch");
  const destinations = destinationLine(data.family);

  return (
    <div className="report-root report-full">
      <section className="report-sheet">
        <ReportCover data={data} assets={assets} />
      </section>

      <section className="report-sheet break-before">
        <ReportBrandHeader
          generatedDate={data.report.generatedDate}
          reportId={data.report.reportId}
        />
        <GoldRule className="mt-8 mb-5" />
        <p className="eyebrow">Your savings map</p>
        <h2 className="mt-3 max-w-xl font-display text-4xl font-bold leading-[0.95] tracking-[-0.02em] text-dark">
          Here&apos;s where the money is hiding.
        </h2>
        {destinations ? (
          <p className="mt-4 text-[15px] text-muted">Mountains in play: {destinations}</p>
        ) : null}
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          These numbers don&apos;t all stack. Destination saves live on those trips. Local saves live
          on Vermont days. I&apos;m showing you the map, not adding every square together and calling
          it a jackpot.
        </p>
        <div className="mt-8">
          <SavingsMap items={data.savingsMap} />
        </div>
        {data.summary.confidence ? (
          <p className="mt-8 font-semibold text-dark">
            Confidence in this picture: {data.summary.confidence}.
          </p>
        ) : null}
        {data.knownSavings.length > 0 ? (
          <div className="mt-8">
            <KnownSavingsCard items={data.knownSavings} />
          </div>
        ) : null}
      </section>

      {discovered.length > 0 ? (
        <section className="report-flow break-before">
          <p className="eyebrow">The opportunities</p>
          <h2 className="mt-3 mb-6 font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark">
            Exact programs. Exact reasons. What I&apos;d actually do.
          </h2>
          <div className="space-y-5">
            {discovered.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        </section>
      ) : null}

      {data.watch.length > 0 ? (
        <section className="report-flow break-before">
          <GoldRule className="mb-5" />
          <p className="eyebrow">Worth watching</p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark">
            These aren&apos;t savings I&apos;m counting today.
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
            They&apos;re worth keeping an eye on. If something changes, they can move — and I&apos;d
            rather tell you that later than inflate the number now.
          </p>
          <div className="mt-6 space-y-4">
            {data.watch.map((item) => (
              <WatchCard key={item.title} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="report-flow break-before">
        <ActionPlan
          strategy={data.strategy}
          closingLine={data.closingLine}
          referralLine={data.referralLine}
        />
        {data.methodology?.text ? (
          <div className="mt-6">
            <TrustCallout title={data.methodology.title} text={data.methodology.text} compact />
          </div>
        ) : null}
      </section>

      <section className="report-sheet break-before flex flex-col">
        {data.sources.length > 0 ? (
          <div>
            <p className="eyebrow">Official sources</p>
            <ul className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1.5">
              {data.sources.map((source) => (
                <li key={source.url || source.label || source.name}>
                  <SourceLink source={source} className="text-[13px]" />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {data.thankYou?.enabled ? (
          <div className="flex flex-1 flex-col justify-center py-8">
            <PersonalThankYou thankYou={data.thankYou} assets={assets} />
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="-mx-[0.5in] -mb-[0.5in]">
          <ReportFooter />
        </div>
      </section>
    </div>
  );
}
