import type { ReportAssets } from "../assets";
import type { ReportData } from "../schema";
import { KnownSavingsCard } from "../components/KnownSavingsCard";
import { OpportunityCard } from "../components/OpportunityCard";
import { PersonalThankYou } from "../components/PersonalThankYou";
import { ReportCover } from "../components/ReportCover";
import { ReportFooter } from "../components/ReportFooter";
import { SourceLink } from "../components/SourceLink";
import { WatchCard } from "../components/WatchCard";

type FullReportProps = {
  data: ReportData;
  assets: ReportAssets;
};

function PlanClose({ data, assets }: FullReportProps) {
  return (
    <>
      {data.sources.length > 0 ? (
        <div className="mt-5">
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
        <div className="mt-5">
          <PersonalThankYou thankYou={data.thankYou} assets={assets} />
        </div>
      ) : null}
      <div className="-mx-[0.48in] mt-4">
        <ReportFooter />
      </div>
    </>
  );
}

export function FullReport({ data, assets }: FullReportProps) {
  const discovered = data.opportunities.filter((item) => item.tier !== "watch");
  const watchOpportunities = data.opportunities.filter((item) => item.tier === "watch");
  const watchOpportunityText = watchOpportunities.map((item) => item.title.toLowerCase()).join(" ");
  const watchItems = data.watch.filter((item) => {
    const title = item.title.toLowerCase();
    if (/4pass/.test(title) && /4pass/.test(watchOpportunityText)) return false;
    if (/indy/.test(title) && /indy/.test(watchOpportunityText)) return false;
    return true;
  });

  return (
    <div className="report-root report-full">
      <section className="report-sheet">
        <ReportCover data={data} assets={assets} />
      </section>

      {discovered.length > 0 || data.knownSavings.length > 0 ? (
        <section className="report-flow break-before">
          {data.knownSavings.length > 0 ? (
            <div className="mb-5">
              <KnownSavingsCard items={data.knownSavings} />
            </div>
          ) : null}
          {discovered.length > 0 ? (
            <>
              <p className="eyebrow">The details</p>
              <div className="mt-3 space-y-4">
                {discovered.map((opportunity) => (
                  <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                ))}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {watchOpportunities.length > 0 || watchItems.length > 0 ? (
        <section className="report-flow">
          <p className="eyebrow">Stuff to keep an eye on</p>
          {data.watchIntro ? (
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted">{data.watchIntro}</p>
          ) : null}
          {watchOpportunities.length > 0 ? (
            <div className="mt-4 space-y-3">
              {watchOpportunities.map((opportunity) => (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          ) : null}
          {watchItems.length > 0 ? (
            <div className="mt-5">
              <p className="eyebrow">Extra notes, not in the Watch count</p>
              <div className="mt-2.5 grid grid-cols-2 gap-3">
                {watchItems.map((item) => (
                  <WatchCard key={item.title} item={item} />
                ))}
              </div>
            </div>
          ) : null}
          <PlanClose data={data} assets={assets} />
        </section>
      ) : (
        <section className="report-flow">
          <PlanClose data={data} assets={assets} />
        </section>
      )}
    </div>
  );
}
