"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import {
  captureAttribution,
  GA4_MEASUREMENT_ID,
  META_PIXEL_ID,
  trackGaPageView,
  trackMetaPageView,
} from "@/lib/analytics";

export function AnalyticsScripts() {
  const pathname = usePathname();
  const [metaReady, setMetaReady] = useState(false);
  const [gaReady, setGaReady] = useState(false);
  const lastMetaPage = useRef<string | null>(null);
  const lastGaPage = useRef<string | null>(null);

  useEffect(() => {
    captureAttribution();
  }, [pathname]);

  useEffect(() => {
    if (!metaReady || lastMetaPage.current === pathname) return;
    trackMetaPageView();
    lastMetaPage.current = pathname;
  }, [metaReady, pathname]);

  useEffect(() => {
    if (!gaReady || lastGaPage.current === pathname) return;
    trackGaPageView();
    lastGaPage.current = pathname;
  }, [gaReady, pathname]);

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        onReady={() => setMetaReady(true)}
      >
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          if (!window.__sfsMetaInitialized) {
            fbq('init', '${META_PIXEL_ID}');
            window.__sfsMetaInitialized = true;
          }
        `}
      </Script>

      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        onReady={() => setGaReady(true)}
      >
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          if (!window.__sfsGaInitialized) {
            gtag('js', new Date());
            gtag('config', '${GA4_MEASUREMENT_ID}', { send_page_view: false });
            window.__sfsGaInitialized = true;
          }
        `}
      </Script>

      <noscript
        dangerouslySetInnerHTML={{
          __html: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1" alt="" />`,
        }}
      />
    </>
  );
}
