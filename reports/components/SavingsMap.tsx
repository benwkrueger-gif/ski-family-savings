import type { ReportData } from "../schema";

type SavingsMapProps = {
  items: ReportData["savingsMap"];
};

export function SavingsMap({ items }: SavingsMapProps) {
  if (!items.length) return null;

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => {
        const watch = item.kind === "watch";
        return (
          <article
            key={item.label}
            className={`overflow-hidden rounded-[4px] border border-border ${
              watch ? "bg-subtle" : "bg-background"
            }`}
          >
            <div className={watch ? "bg-subtle px-4 py-3.5" : "bg-dark px-4 py-3.5"}>
              <p className={`eyebrow ${watch ? "" : "text-white/80"}`}>{item.label}</p>
              {item.potential ? (
                <p
                  className={`mt-1.5 font-display text-[1.85rem] font-bold leading-none tracking-[-0.04em] ${
                    watch ? "text-dark" : "text-accent"
                  }`}
                >
                  {item.potential}
                </p>
              ) : null}
            </div>
            {item.note ? (
              <p className="px-4 py-2.5 text-[12px] leading-snug text-muted">{item.note}</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
