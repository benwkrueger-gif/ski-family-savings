import type { Source } from "../schema";
import { SourceLink } from "./SourceLink";

export function SourceLinks({
  sources,
  className = "",
}: {
  sources: Source[];
  className?: string;
}) {
  if (!sources.length) return null;

  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-1 ${className}`}>
      {sources.map((source) => (
        <SourceLink key={source.url || source.name || source.label} source={source} />
      ))}
    </div>
  );
}
