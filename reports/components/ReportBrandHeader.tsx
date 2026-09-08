type ReportBrandHeaderProps = {
  generatedDate?: string;
  preparedFor?: string;
  inverted?: boolean;
};

export function ReportBrandHeader({
  generatedDate,
  preparedFor,
  inverted = false,
}: ReportBrandHeaderProps) {
  const meta = [
    preparedFor ? `Prepared for ${preparedFor}` : null,
    generatedDate,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={`flex items-end justify-between gap-4 ${
        inverted ? "" : "border-b border-border pb-3"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className="h-3.5 w-3.5 shrink-0 bg-accent" />
        <p
          className={`font-display text-[15px] font-bold tracking-wide ${
            inverted ? "text-white" : "text-dark"
          }`}
        >
          Ski Family Savings
        </p>
      </div>
      {meta ? (
        <p className={`text-[11px] leading-none ${inverted ? "text-white/70" : "text-muted"}`}>
          {meta}
        </p>
      ) : null}
    </div>
  );
}
