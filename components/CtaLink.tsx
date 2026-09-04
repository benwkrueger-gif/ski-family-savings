"use client";

import type { FocusEvent, MouseEvent, ReactNode } from "react";
import {
  buildAttributedTallyUrl,
  trackScanStart,
  type CtaLocation,
} from "@/lib/analytics";
import { TALLY_FORM_URL } from "@/lib/config";

type CtaVariant = "primary" | "nav" | "sticky" | "onDark";

const base =
  "inline-flex items-center justify-center font-display font-bold leading-none tracking-wide transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2";

const styles: Record<CtaVariant, string> = {
  primary: `${base} rounded-[4px] bg-accent px-8 py-4 text-base text-dark hover:bg-accent-hover focus-visible:outline-dark`,
  nav: `${base} rounded-[4px] bg-accent px-5 py-2.5 text-sm text-dark hover:bg-accent-hover focus-visible:outline-dark`,
  sticky: `${base} w-full rounded-[4px] bg-accent px-6 py-4 text-base text-dark hover:bg-accent-hover focus-visible:outline-dark`,
  onDark: `${base} rounded-[4px] bg-accent px-8 py-4 text-base text-dark hover:bg-accent-hover focus-visible:outline-white`,
};

export function CtaLink({
  children,
  ctaLocation,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  ctaLocation: CtaLocation;
  variant?: CtaVariant;
  className?: string;
}) {
  const prepareLink = (
    event: MouseEvent<HTMLAnchorElement> | FocusEvent<HTMLAnchorElement>
  ) => {
    event.currentTarget.href = buildAttributedTallyUrl(TALLY_FORM_URL);
  };

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    prepareLink(event);
    trackScanStart(ctaLocation);
  };

  return (
    <a
      href={TALLY_FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      data-cta-location={ctaLocation}
      onFocus={prepareLink}
      onMouseEnter={prepareLink}
      onClick={handleClick}
      className={`${styles[variant]} ${className}`}
    >
      {children}
    </a>
  );
}
