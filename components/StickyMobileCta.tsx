"use client";

import { useEffect, useState } from "react";
import { CtaLink } from "@/components/CtaLink";

export function StickyMobileCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    const finalCta = document.getElementById("final-cta");
    if (!hero) return;

    let pastHero = false;
    let inFinal = false;

    const update = () => setVisible(pastHero && !inFinal);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target.id === "hero") {
            pastHero = !entry.isIntersecting;
          }
          if (entry.target.id === "final-cta") {
            inFinal = entry.isIntersecting;
          }
        }
        update();
      },
      { threshold: 0.12 }
    );

    observer.observe(hero);
    if (finalCta) observer.observe(finalCta);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-dark bg-dark px-4 py-3 md:hidden transition duration-200 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0"
      }`}
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <CtaLink ctaLocation="sticky_mobile" variant="sticky">
        See what I can find →
      </CtaLink>
    </div>
  );
}
