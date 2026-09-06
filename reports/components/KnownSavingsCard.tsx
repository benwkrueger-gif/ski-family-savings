import type { KnownSaving } from "../schema";
import { SourceLink } from "./SourceLink";

type KnownSavingsCardProps = {
  items: KnownSaving[];
};

export function KnownSavingsCard({ items }: KnownSavingsCardProps) {
  if (!items.length) return null;

  return (
    <section className="avoid-break">
      <p className="eyebrow">You already knew this one</p>
      <h2 className="mt-3 font-display text-[1.65rem] font-bold leading-[0.95] tracking-[-0.02em] text-dark">
        I verified it. I&apos;m not pretending I discovered it.
      </h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <article key={item.title} className="rounded-[4px] border border-border bg-subtle px-5 py-3.5">
            <p className="font-display text-lg font-bold tracking-tight text-dark">{item.title}</p>
            {item.note ? (
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{item.note}</p>
            ) : (
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                You already told me you knew about this, so I did not count it as a discovery.
              </p>
            )}
            {item.source ? (
              <div className="mt-2">
                <SourceLink source={item.source} />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
