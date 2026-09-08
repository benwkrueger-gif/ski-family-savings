import type { WatchItem } from "../schema";
import { SourceLink } from "./SourceLink";

type WatchCardProps = {
  item: WatchItem;
};

export function WatchCard({ item }: WatchCardProps) {
  return (
    <article className="avoid-break flex overflow-hidden rounded-[4px] border border-border bg-subtle">
      <span className="w-1.5 shrink-0 bg-border" />
      <div className="flex-1 px-4 py-3">
        <p className="text-[11px] font-semibold tracking-wide text-muted">Note</p>
        <h3 className="mt-1 font-display text-[1.05rem] font-bold leading-tight tracking-tight text-dark">
          {item.title}
        </h3>
        {item.whatWeAreWatching ? (
          <p className="mt-1.5 text-[13px] leading-snug text-muted">{item.whatWeAreWatching}</p>
        ) : null}
        {item.source ? (
          <div className="mt-2">
            <SourceLink source={item.source} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
