import type { KnownSaving } from "../schema";
import { SourceLink } from "./SourceLink";

type KnownSavingsCardProps = {
  items: KnownSaving[];
};

export function KnownSavingsCard({ items }: KnownSavingsCardProps) {
  if (!items.length) return null;

  return (
    <section>
      <p className="eyebrow">Things you&apos;re already doing right</p>
      <div className="mt-2.5 grid grid-cols-3 gap-2.5">
        {items.map((item) => (
          <article key={item.title} className="rounded-[4px] border border-border bg-subtle px-3 py-2.5">
            <p className="font-display text-[13px] font-bold leading-snug tracking-tight text-dark">{item.title}</p>
            {item.note ? <p className="mt-1 text-[11px] leading-snug text-muted">{item.note}</p> : null}
            {item.source ? (
              <div className="mt-1.5">
                <SourceLink source={item.source} className="text-[11px]" />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
