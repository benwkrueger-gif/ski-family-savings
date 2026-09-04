import type { Metadata } from "next";
import { FreeScanConversion } from "@/components/FreeScanConversion";
import { SKIER_GIF_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "I'm On It | Ski Family Savings Scan",
  description:
    "I've got your ski plans. Now I'm doing the annoying part. Expect your Savings Scan within 2 business days.",
  robots: {
    index: false,
    follow: false,
  },
};

const receiveItems = [
  "My estimate of your total potential savings",
  "How many Jackpot opportunities I found",
  "How many Strong opportunities I found",
  "How many additional Useful opportunities I found",
  "Anything worth keeping an eye on",
];

const huntRows = [
  {
    emoji: "🔥",
    title: "JACKPOT",
    detail: "Potential savings of $250+",
    bar: "bg-accent",
  },
  {
    emoji: "🟢",
    title: "STRONG",
    detail: "Potential savings of $50–$250",
    bar: "bg-accent-blue",
  },
  {
    emoji: "🟡",
    title: "USEFUL",
    detail: "Smaller savings that may still be worth grabbing",
    bar: "bg-[#6a6c69]",
  },
  {
    emoji: "🔔",
    title: "WATCH",
    detail: "Something that could become valuable later",
    bar: "bg-border",
  },
];

export default function ScanInProgressPage() {
  return (
    <>
      <FreeScanConversion />
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
              Actual footage of me hunting for your ski savings.
            </p>
          </div>
        </section>

        <section className="bg-background px-5 pb-16 sm:px-8 sm:pb-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">I&apos;M ON IT</p>
            <h1 className="mt-4 font-display text-[2.15rem] font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-5xl">
              I&apos;m diving in to find your family&apos;s ski savings.
            </h1>
            <div className="mt-7 space-y-4 text-[17px] leading-relaxed text-muted sm:text-lg">
              <p>I&apos;ve got your ski plans. Now I&apos;m doing the annoying part.</p>
              <p>
                I&apos;m looking at your family&apos;s ages, grades, location,
                passes, resorts and trips to see where meaningful savings may be
                hiding.
              </p>
              <p className="font-semibold text-dark">
                This isn&apos;t a generic coupon search. I&apos;m researching your
                family specifically and checking what I find against the actual
                source.
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
              <p>I work through scans in the order they come in.</p>
              <p>
                Most are finished within 2 business days. If I get slammed with
                requests, yours may take a little longer.
              </p>
              <p>As soon as your scan is ready, I&apos;ll send it straight to your inbox.</p>
              <p className="font-semibold text-dark">
                Keep an eye out for an email from Ski Family Savings.
              </p>
              <p className="text-sm">
                And maybe check Promotions or Spam if it goes missing.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-background px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-lg">
            <h2 className="text-center font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl">
              I&apos;m looking for the savings that actually matter.
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
              I&apos;m not trying to come back with the longest list.
            </p>
            <p className="mt-3 text-[17px] leading-relaxed text-muted">
              I&apos;m trying to figure out which opportunities actually fit your
              family — and which ones could meaningfully change what you spend.
            </p>
          </div>
        </section>

        <section className="bg-subtle px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl">
                Your Savings Scan answers one question:
              </h2>
              <p className="mt-6 inline-block bg-accent px-4 py-3 font-display text-[1.65rem] font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:px-6 sm:py-4 sm:text-4xl lg:text-[2.5rem]">
                Is there enough money here to care about?
              </p>
            </div>
            <p className="mt-10 text-[17px] text-muted">When I&apos;m done, you&apos;ll get:</p>
            <ul className="mt-5 space-y-3">
              {receiveItems.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] font-semibold leading-snug text-dark">
                  <CheckIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm leading-relaxed text-muted">
              I won&apos;t pretend I &ldquo;found&rdquo; savings you already told
              me about, and I won&apos;t double-count deals that can&apos;t actually
              be used together.
            </p>
          </div>
        </section>

        <section className="bg-background px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <div className="rule-gold mb-6" />
            <h2 className="font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl">
              Why all those questions mattered.
            </h2>
            <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-muted sm:text-lg">
              <p>A kid&apos;s age or grade can unlock a completely different program.</p>
              <p>Your ZIP code can change what you&apos;re eligible for.</p>
              <p>
                A trip you&apos;re already planning can make an existing pass way
                more valuable.
              </p>
              <p>
                And sometimes the cheapest-looking deal for one person is actually
                the expensive option for the whole family.
              </p>
              <p className="font-semibold text-dark">
                I&apos;m putting those pieces together now.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-subtle px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl">
              That&apos;s it. I&apos;ll do the digging from here.
            </h2>
            <p className="mt-6 text-[17px] leading-relaxed text-muted sm:text-lg">
              If there&apos;s meaningful money hiding in your family&apos;s ski
              plans, I&apos;ll figure out how much appears to be worth pursuing.
            </p>
            <p className="mt-5 font-semibold text-dark sm:text-lg">
              Your Savings Scan should be in your inbox within 2 business days.
            </p>
            <p className="mt-4 text-sm text-muted">Go think about snow instead.</p>
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
