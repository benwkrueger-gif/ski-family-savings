import type { ReportAssets } from "../assets";
import type { ReportData } from "../schema";
import { formatFamilyLine } from "../family-line";
import { ReportBrandHeader } from "./ReportBrandHeader";
import { SavingsScorecard } from "./SavingsScorecard";
import { SourceLink } from "./SourceLink";

type ReportCoverProps = {
  data: ReportData;
  assets: ReportAssets;
};

export function ReportCover({ data, assets }: ReportCoverProps) {
  const firstStep = data.strategy?.steps[0];
  const familyLine = formatFamilyLine(data.family);

  return (
    <div>
      <ReportBrandHeader
        generatedDate={data.report.generatedDate}
        reportId={data.report.reportId}
      />

      <div className="mt-8 grid grid-cols-[1.05fr_0.95fr] items-stretch gap-8">
        <div>
          <p className="eyebrow">Your family&apos;s Savings Plan</p>
          <h1 className="mt-4 font-display text-[2.75rem] font-bold leading-[0.95] tracking-[-0.02em] text-dark">
            {data.family.firstName}&apos;s Family
          </h1>
          {familyLine ? (
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{familyLine}</p>
          ) : null}
        </div>
        <div className="relative min-h-[220px] overflow-hidden rounded-[4px] bg-subtle">
          <img
            src={assets.hero}
            alt="A family in ski gear on a mountain ridge"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-[4px] border border-border">
        <div className="bg-dark px-8 py-10 text-center">
          <p className="font-display text-[5.2rem] font-bold leading-none tracking-[-0.04em] text-accent">
            {data.summary.headlineSavings}
          </p>
          <p className="mt-4 font-display text-sm font-bold tracking-wide text-white">
            potential savings worth pursuing
          </p>
        </div>
        <SavingsScorecard
          jackpotCount={data.summary.jackpotCount}
          strongCount={data.summary.strongCount}
          usefulCount={data.summary.usefulCount}
          watchCount={data.summary.watchCount}
        />
      </div>

      {data.summary.subhead ? (
        <p className="mt-8 max-w-2xl text-[17px] leading-relaxed text-muted">{data.summary.subhead}</p>
      ) : null}

      {firstStep ? (
        <div className="mt-8 avoid-break">
          <div className="rule-gold mb-4" />
          <p className="eyebrow">What I&apos;d do first</p>
          <div className="mt-3 flex gap-5">
            <p className="font-display text-6xl font-bold leading-none text-accent">{firstStep.number}</p>
            <div className="pt-1">
              <h2 className="font-display text-2xl font-bold leading-tight tracking-tight text-dark">
                {firstStep.title}
              </h2>
              {firstStep.description ? (
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{firstStep.description}</p>
              ) : null}
              {firstStep.source ? (
                <div className="mt-2">
                  <SourceLink source={firstStep.source} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
