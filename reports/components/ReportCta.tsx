type ReportCtaProps = {
  href?: string;
  children: React.ReactNode;
  className?: string;
};

const ctaClass =
  "inline-flex items-center justify-center rounded-[4px] bg-accent px-8 py-4 font-display text-base font-bold leading-none tracking-wide text-dark";

export function ReportCta({ href, children, className = "" }: ReportCtaProps) {
  const classes = `${ctaClass} ${className}`;

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return <span className={classes}>{children}</span>;
}
