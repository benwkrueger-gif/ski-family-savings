type TrustCalloutProps = {
  title?: string;
  text?: string;
  compact?: boolean;
};

export function TrustCallout({
  title = "No fake wins",
  text,
  compact = false,
}: TrustCalloutProps) {
  if (!text) return null;

  return (
    <div>
      <div className={`rule-gold ${compact ? "mb-2" : "mb-4"}`} />
      <p
        className={`font-display font-bold leading-[0.95] tracking-[-0.02em] text-dark ${
          compact ? "text-xl" : "text-2xl"
        }`}
      >
        {title}
      </p>
      <p className={`leading-relaxed text-muted ${compact ? "mt-1.5 text-[13px]" : "mt-3 text-[15px]"}`}>
        {text}
      </p>
    </div>
  );
}
