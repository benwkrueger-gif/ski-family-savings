import type { ReportData } from "../schema";

type SavingsMapProps = {
  items: ReportData["savingsMap"];
};

export function SavingsMap({ items }: SavingsMapProps) {
  if (!items.length) return null;

  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((item) => {
        const watch = item.kind === "watch";
        return (
          <article
            key={item.label}
            className={`overflow-hidden rounded-[4px] border border-border ${
              watch ? "bg-subtle" : "bg-background"
            }`}
          >
            <div className={watch ? "bg-subtle px-5 py-5" : "bg-dark px-5 py-5"}>
              <p className={`eyebrow ${watch ? "" : "text-white/80"}`}>{item.label}</p>
              {item.potential ? (
                <p
                  className={`mt-2 font-display text-4xl font-bold leading-none tracking-[-0.04em] ${
                    watch ? "text-dark" : "text-accent"
                  }`}
                >
                  {item.potential}
                </p>
              ) : null}
            </div>
            {item.note ? (
              <p className="px-5 py-3 text-[13px] leading-relaxed text-muted">{item.note}</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
