type RecommendedActionProps = {
  action?: string;
  label?: string;
};

export function RecommendedAction({ action, label = "What I'd do" }: RecommendedActionProps) {
  if (!action) return null;

  return (
    <div className="opp-section bg-accent px-4 py-3">
      <p className="font-display text-[11px] font-bold tracking-[0.08em] text-dark">{label.toUpperCase()}</p>
      <p className="mt-1 font-display text-[15px] font-bold leading-snug tracking-tight text-dark">
        {action}
      </p>
    </div>
  );
}
