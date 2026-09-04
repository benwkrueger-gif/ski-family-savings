"use client";

import { useEffect } from "react";
import {
  analyticsAreReady,
  trackFreeScanSubmitted,
} from "@/lib/analytics";

const CONVERSION_STORAGE_KEY = "sfs:free-scan-submitted";
const MAX_READY_CHECKS = 50;

export function FreeScanConversion() {
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(CONVERSION_STORAGE_KEY)) return;
    } catch {
      // Continue without deduplication if browser storage is unavailable.
    }

    let cancelled = false;
    let checks = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const trackWhenReady = () => {
      if (cancelled) return;

      if (analyticsAreReady()) {
        trackFreeScanSubmitted();
        try {
          window.sessionStorage.setItem(CONVERSION_STORAGE_KEY, "true");
        } catch {
          // The in-memory cancellation guard still prevents rerender duplicates.
        }
        return;
      }

      checks += 1;
      if (checks < MAX_READY_CHECKS) {
        timeout = setTimeout(trackWhenReady, 100);
      }
    };

    trackWhenReady();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return null;
}
