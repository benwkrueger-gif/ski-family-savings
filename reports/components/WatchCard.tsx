import type { WatchItem } from "../schema";
import { SourceLink } from "./SourceLink";

type WatchCardProps = {
  item: WatchItem;
};

export function WatchCard({ item }: WatchCardProps) {
  const rows = [
    { label: "What I'm watching", value: item.whatWeAreWatching },
    { label: "What would trigger it", value: item.trigger },
    { label: "Why it could matter", value: item.whyItCouldMatter },
    { label: "When to look", value: item.expectedTiming },
  ].filter((row) => row.value);

  return (
    <article className="avoid-break flex overflow-hidden rounded-[4px] border border-border bg-subtle">
      <span className="w-1.5 shrink-0 bg-border" />
      <div className="flex-1 px-5 py-4">
        <p className="font-display text-xs font-bold tracking-wide text-dark">🔔 WATCH</p>
        <h3 className="mt-2 font-display text-xl font-bold leading-tight tracking-tight text-dark">
          {item.title}
        </h3>
        {rows.length > 0 ? (
          <dl className="mt-4 space-y-3">
            {rows.map((row) => (
              <div key={row.label}>
                <dt className="eyebrow">{row.label}</dt>
                <dd className="mt-1 text-[14px] leading-relaxed text-muted">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {item.source ? (
          <div className="mt-4">
            <SourceLink source={item.source} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
