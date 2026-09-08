import type { ReportAssets } from "../assets";
import type { ReportData } from "../schema";
import { ActionPlan } from "./ActionPlan";
import { formatFamilyLine } from "../family-line";
import { ReportBrandHeader } from "./ReportBrandHeader";
import { SavingsHero } from "./SavingsHero";
import { SavingsScorecard } from "./SavingsScorecard";

type ReportCoverProps = {
  data: ReportData;
  assets: ReportAssets;
};

export function ReportCover({ data, assets }: ReportCoverProps) {
  const familyLine = formatFamilyLine({
    ...data.family,
    skiProfile: undefined,
  });
  const firmHeadline = data.summary.headlineKind !== "conditional";

  return (
    <div>
      <ReportBrandHeader
        generatedDate={data.report.generatedDate}
        preparedFor={data.freeScan?.preparedFor ?? data.family.firstName}
      />

      <div className="mt-5 grid grid-cols-[1.05fr_0.95fr] items-stretch gap-6">
        <div>
          <p className="eyebrow">Your Savings Plan</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-bold leading-[0.95] tracking-[-0.02em] text-dark">
            Prepared for {data.family.firstName}
          </h1>
          {familyLine ? (
            <p className="mt-2 text-[14px] leading-relaxed text-muted">{familyLine}</p>
          ) : null}
        </div>
        <div className="relative min-h-[120px] overflow-hidden rounded-[4px] bg-subtle">
          <img
            src={assets.hero}
            alt="A family in ski gear on a mountain ridge"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </div>
      </div>

      {data.planVoice?.opening && !data.strategy?.steps.length ? (
        <p className="mt-5 max-w-2xl whitespace-pre-line text-[14px] leading-relaxed text-dark">
          {data.planVoice.opening}
        </p>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-[4px] border border-border">
        {firmHeadline ? (
          <SavingsHero amount={data.summary.headlineSavings} caption="counted savings" compact />
        ) : (
          <div className="bg-dark px-6 py-5 text-center">
            <p className="font-display text-[1.1rem] font-bold leading-snug tracking-[-0.02em] text-white">
              I couldn&apos;t lock in a sure number yet.
            </p>
            {data.summary.conditionalSavings ? (
              <p className="mt-3 font-display text-[2rem] font-bold leading-none tracking-[-0.03em] text-accent">
                {data.summary.conditionalSavings}
              </p>
            ) : null}
            <p className="mt-2 text-[12px] leading-snug text-white/75">
              possible if a couple things still go your way
            </p>
          </div>
        )}
        <SavingsScorecard
          jackpotCount={data.summary.jackpotCount}
          strongCount={data.summary.strongCount}
          usefulCount={data.summary.usefulCount}
          watchCount={data.summary.watchCount}
          compact
        />
      </div>

      {data.strategy?.steps.length ? (
        <div className="mt-5">
          <ActionPlan strategy={data.strategy} />
        </div>
      ) : null}
    </div>
  );
}
