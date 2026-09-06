import type { Source } from "../schema";

type SourceLinkProps = {
  source?: Source;
  className?: string;
};

export function SourceLink({ source, className = "" }: SourceLinkProps) {
  if (!source) return null;

  const label = source.name || source.label;
  if (!label) return null;

  const url = source.url?.trim();

  if (url) {
    return (
      <a
        href={url}
        className={`font-display text-sm font-bold tracking-wide text-accent-blue ${className}`}
      >
        {label} →
      </a>
    );
  }

  return (
    <p className={`font-display text-sm font-bold tracking-wide text-accent-blue ${className}`}>
      {label}
    </p>
  );
}
