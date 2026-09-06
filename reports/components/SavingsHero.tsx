type SavingsHeroProps = {
  amount: string;
  caption?: string;
  compact?: boolean;
};

export function SavingsHero({
  amount,
  caption = "potential savings worth pursuing",
  compact = false,
}: SavingsHeroProps) {
  return (
    <div
      className={`bg-dark text-center ${
        compact ? "px-5 py-6" : "px-6 py-10 sm:px-8 sm:py-14"
      }`}
    >
      <p
        className={`font-display font-bold leading-none tracking-[-0.04em] text-accent ${
          compact
            ? "text-[3.35rem]"
            : "text-7xl sm:text-8xl"
        }`}
      >
        {amount}
      </p>
      <p
        className={`font-display font-bold tracking-wide text-white ${
          compact ? "mt-2 text-xs" : "mt-4 text-sm"
        }`}
      >
        {caption}
      </p>
    </div>
  );
}
