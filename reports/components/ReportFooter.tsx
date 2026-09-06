type ReportFooterProps = {
  compact?: boolean;
};

export function ReportFooter({ compact = false }: ReportFooterProps) {
  return (
    <footer className={`avoid-break border-t-4 border-accent bg-dark ${compact ? "px-5 py-3" : "px-6 py-5"}`}>
      <p className="font-display text-[13px] font-bold tracking-wide text-white">Ski Family Savings</p>
      <p className={`max-w-md leading-relaxed text-white/70 ${compact ? "mt-0.5 text-[10px]" : "mt-1 text-xs"}`}>
        Built for families who love skiing and hate paying more than they need to.
      </p>
    </footer>
  );
}
