import type { Metadata } from "next";
import { SKIER_GIF_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "We're On It | Ski Family Savings Scan",
  description:
    "We've got your family's ski info and we're getting to work. Expect your Ski Family Savings Scan within 2 business days.",
  robots: {
    index: false,
    follow: false,
  },
};

const receiveItems = [
  "Your estimated potential savings",
  "How many Jackpot opportunities we found",
  "How many Strong opportunities we found",
  "How many additional Useful opportunities we found",
  "Any programs we think are worth keeping an eye on",
];

const huntRows = [
  {
    emoji: "🔥",
    title: "Jackpot opportunities",
    detail: "Potential savings of $250+",
    bar: "bg-accent",
  },
  {
    emoji: "🟢",
    title: "Strong opportunities",
    detail: "Potential savings of $50–$250",
    bar: "bg-accent-blue",
  },
  {
    emoji: "🟡",
    title: "Useful opportunities",
    detail: "Smaller or more situational savings",
    bar: "bg-[#6a6c69]",
  },
  {
    emoji: "🔔",
    title: "Worth watching",
    detail: "Programs or opportunities that could become relevant to your family later",
    bar: "bg-border",
  },
];

export default function ScanInProgressPage() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <a href="/" className="font-display text-[15px] font-bold tracking-wide text-dark">
            Ski Family Savings
          </a>
        </div>
      </header>

      <main>
        <section className="bg-background px-5 pt-10 pb-6 sm:px-8 sm:pt-14">
          <div className="mx-auto max-w-xl text-center">
            <SkierGif />
            <p className="mt-3 text-sm text-muted">
              Actual footage of us looking for your ski deals.
            </p>
          </div>
        </section>

        <section className="bg-background px-5 pb-16 sm:px-8 sm:pb-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">WE&apos;RE ON IT</p>
            <h1 className="mt-4 font-display text-[2.15rem] font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-5xl">
              We&apos;re digging into your family&apos;s ski savings.
            </h1>
            <div className="mt-7 space-y-4 text-[17px] leading-relaxed text-muted sm:text-lg">
              <p>We&apos;ve got your family&apos;s ski info and we&apos;re getting to work!</p>
              <p>
                We&apos;ll look at how and where your family skis and search for
                discounts, programs, passes and other savings that may apply
                specifically to you.
              </p>
              <p className="font-semibold text-dark">
                This isn&apos;t an automated coupon search. We&apos;re actually researching
                your family&apos;s situation and source-checking what we find.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-subtle px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <div className="overflow-hidden rounded-[4px] border border-border bg-dark px-6 py-10 text-center sm:px-10 sm:py-12">
              <h2 className="font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-white sm:text-4xl lg:text-[2.6rem]">
                Expect your Savings Scan within{" "}
                <span className="text-accent">2 business days.</span>
              </h2>
            </div>
            <div className="mt-8 space-y-4 text-[17px] leading-relaxed text-muted sm:text-lg">
              <p>We work through scans in the order they&apos;re received.</p>
              <p className="font-semibold text-dark">
                Most scans are completed within 2 business days. If we&apos;re getting a
                surge of requests, yours may take a little longer.
              </p>
              <p>As soon as your scan is ready, we&apos;ll send it straight to your inbox.</p>
              <p className="font-semibold text-dark">
                Keep an eye out for an email from Ski Family Savings.
              </p>
              <p>If you don&apos;t see it, check Promotions or Spam too.</p>
            </div>
          </div>
        </section>

        <section className="bg-background px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-lg">
            <h2 className="text-center font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl">
              Here&apos;s what we&apos;re hunting for.
            </h2>
            <div className="mt-10 divide-y divide-border overflow-hidden rounded-[4px] border border-border bg-background">
              {huntRows.map((row) => (
                <div key={row.title} className="flex gap-4 px-5 py-4 sm:px-6">
                  <span className={`mt-1 w-1.5 shrink-0 ${row.bar}`} />
                  <div>
                    <p className="font-display font-bold text-dark">
                      {row.emoji} {row.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{row.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-8 font-semibold text-dark">
              The goal isn&apos;t to come back with the biggest possible list.
            </p>
            <p className="mt-3 text-[17px] leading-relaxed text-muted">
              It&apos;s to figure out whether there are meaningful savings that actually
              fit <strong className="text-dark">your family and the way you ski.</strong>
            </p>
          </div>
        </section>

        <section className="bg-subtle px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl">
                Your Savings Scan will answer one simple question:
              </h2>
              <p className="mt-6 inline-block bg-accent px-4 py-3 font-display text-[1.65rem] font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:px-6 sm:py-4 sm:text-4xl lg:text-[2.5rem]">
                How much could your family potentially save?
              </p>
            </div>
            <p className="mt-10 text-[17px] text-muted">We&apos;ll send you:</p>
            <ul className="mt-5 space-y-3">
              {receiveItems.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] font-semibold leading-snug text-dark">
                  <CheckIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-background px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <div className="rule-gold mb-6" />
            <h2 className="font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl">
              This is where your answers matter.
            </h2>
            <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-muted sm:text-lg">
              <p>A child&apos;s age or grade can unlock a completely different program.</p>
              <p>Where you live can change what you&apos;re eligible for.</p>
              <p>
                A resort you&apos;re traveling to might offer savings your home mountain
                doesn&apos;t.
              </p>
              <p>
                And a pass one family member qualifies for can sometimes change the
                best option for everyone else.
              </p>
              <p className="font-semibold text-dark">
                We&apos;re putting those pieces together for your family now.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-subtle px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl">
              That&apos;s it. We&apos;ll do the digging from here.
            </h2>
            <p className="mt-6 text-[17px] leading-relaxed text-muted sm:text-lg">
              We&apos;ll use the information you gave us to look for meaningful ski
              savings that appear to fit your family.
            </p>
            <p className="mt-5 font-semibold text-dark sm:text-lg">
              Keep an eye on your inbox. Your Ski Family Savings Scan should be
              headed your way within 2 business days.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t-4 border-accent bg-dark">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <p className="font-display text-[15px] font-bold tracking-wide text-white">
            Ski Family Savings
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
            Built for families who love skiing and hate paying more than they need to.
          </p>
        </div>
      </footer>
    </>
  );
}

function SkierGif() {
  const isEmbed =
    SKIER_GIF_URL.includes("/embed/") || SKIER_GIF_URL.includes("tenor.com/embed");

  return (
    <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[4px] border border-border bg-subtle">
      {isEmbed ? (
        <div className="relative aspect-video w-full">
          <iframe
            src={SKIER_GIF_URL}
            title="Skier doing an impressive jump"
            className="absolute inset-0 h-full w-full"
            allowFullScreen
          />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={SKIER_GIF_URL}
          alt="Skier doing an impressive jump"
          className="mx-auto max-h-64 w-full object-cover"
        />
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-accent-blue" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M6.4 10.2 8.7 12.5 13.6 7.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
