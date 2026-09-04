export const META_PIXEL_ID = "1743148040240739";
export const GA4_MEASUREMENT_ID = "G-SDSE05GJZG";

export type CtaLocation =
  | "header"
  | "hero"
  | "example_result"
  | "how_it_works"
  | "who_its_for"
  | "founder"
  | "final_cta"
  | "sticky_mobile";

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
] as const;

type CampaignKey = (typeof ATTRIBUTION_KEYS)[number];

export type Attribution = Partial<Record<CampaignKey, string>> & {
  first_landing_page?: string;
  referrer?: string;
};

type StoredAttribution = {
  attribution: Attribution;
  expiresAt: number;
};

const ATTRIBUTION_STORAGE_KEY = "sfs:first-touch-attribution";
const ATTRIBUTION_BRIDGE_TTL_MS = 30 * 60 * 1000;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

function readStorage(storage: Storage): StoredAttribution | null {
  try {
    const raw = storage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;

    const stored = JSON.parse(raw) as StoredAttribution;
    if (!stored.attribution || stored.expiresAt <= Date.now()) {
      storage.removeItem(ATTRIBUTION_STORAGE_KEY);
      return null;
    }

    return stored;
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage, value: StoredAttribution) {
  try {
    storage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Tracking must never interfere with the scan flow.
  }
}

export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};

  const sessionAttribution = readStorage(window.sessionStorage);
  if (sessionAttribution) return sessionAttribution.attribution;

  const bridgedAttribution = readStorage(window.localStorage);
  if (bridgedAttribution) {
    writeStorage(window.sessionStorage, bridgedAttribution);
    return bridgedAttribution.attribution;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const attribution: Attribution = {
    first_landing_page: `${window.location.origin}${window.location.pathname}`,
    referrer: document.referrer || undefined,
  };

  for (const key of ATTRIBUTION_KEYS) {
    const value = searchParams.get(key);
    if (value) attribution[key] = value;
  }

  const stored = {
    attribution,
    expiresAt: Date.now() + ATTRIBUTION_BRIDGE_TTL_MS,
  };

  writeStorage(window.sessionStorage, stored);
  // This short-lived copy bridges attribution into the new tab opened for Tally.
  writeStorage(window.localStorage, stored);

  return attribution;
}

export function buildAttributedTallyUrl(baseUrl: string): string {
  if (typeof window === "undefined") return baseUrl;

  const url = new URL(baseUrl);
  const attribution = captureAttribution();

  for (const [key, value] of Object.entries(attribution)) {
    if (value && !url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

export function analyticsAreReady(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.fbq === "function" &&
    typeof window.gtag === "function"
  );
}

export function trackMetaPageView() {
  if (typeof window === "undefined") return;

  try {
    window.fbq?.("track", "PageView");
  } catch {
    // Ad blockers should not affect the page.
  }
}

export function trackGaPageView() {
  if (typeof window === "undefined") return;

  try {
    window.gtag?.("event", "page_view", {
      page_location: window.location.href,
      page_path: `${window.location.pathname}${window.location.search}`,
      page_title: document.title,
    });
  } catch {
    // Analytics failures should not affect the page.
  }
}

export function trackScanStart(ctaLocation: CtaLocation) {
  if (typeof window === "undefined") return;

  try {
    window.fbq?.("trackCustom", "StartSavingsScan", {
      cta_location: ctaLocation,
    });
  } catch {
    // Ad blockers should not affect navigation.
  }

  try {
    window.gtag?.("event", "scan_cta_click", {
      cta_location: ctaLocation,
      destination: "tally",
    });
  } catch {
    // Analytics failures should not affect navigation.
  }
}

export function trackFreeScanSubmitted() {
  if (typeof window === "undefined") return;

  const attribution = captureAttribution();
  const campaignAttribution = Object.fromEntries(
    ATTRIBUTION_KEYS.flatMap((key) =>
      attribution[key] ? [[key, attribution[key]]] : []
    )
  );

  try {
    window.fbq?.("track", "Lead");
  } catch {
    // Ad blockers should not affect the thank-you page.
  }

  try {
    window.gtag?.("event", "generate_lead", {
      lead_type: "free_savings_scan",
      ...campaignAttribution,
    });
  } catch {
    // Analytics failures should not affect the thank-you page.
  }
}
