import Image from "next/image";
import { CtaLink } from "@/components/CtaLink";
import { StickyMobileCta } from "@/components/StickyMobileCta";

const searchItems = [
  "Kids-ski-free programs",
  "Grade-school ski passports",
  "Resident discounts",
  "Youth pricing",
  "Multi-mountain passes",
  "Family pricing",
  "Passholder benefits",
  "Lesson deals",
  "Rental deals",
  "Ski-club and association offers",
  "Resort promotions",
  "Lodging packages",
  "Limited-time offers",
  "First-timer programs",
  "Programs in destinations you're considering",
  "Opportunities unlocked by another family member",
];

const whoItems = [
  "Ski several days or more each winter",
  "Have school-age kids",
  "Ski at more than one resort",
  "Take one or more ski trips",
  "Are deciding between passes or ticket options",
  "Spend meaningful money on lift access, lessons, rentals or lodging",
];

const faqs = [
  {
    q: "Is the Ski Family Savings Scan really free?",
    a: (
      <>
        <p>Yes.</p>
        <p>
          There is no charge and no credit card required to submit your family
          information and receive your Ski Family Savings Scan.
        </p>
      </>
    ),
  },
  {
    q: "What will my Savings Scan tell me?",
    a: (
      <>
        <p>We&apos;ll tell you:</p>
        <ul className="list-none space-y-2 pl-0">
          <li>How much potential savings we estimate may be available to your family</li>
          <li>How many Jackpot savings opportunities we found</li>
          <li>How many Strong opportunities we found</li>
          <li>How many additional Useful opportunities we found</li>
          <li>Whether there are programs we think are worth watching</li>
        </ul>
        <p>The goal of the scan is simple:</p>
        <p className="font-semibold text-dark">
          Help you understand whether your family appears to have meaningful ski
          savings available and approximately how much.
        </p>
      </>
    ),
  },
  {
    q: "What kinds of families is this best for?",
    a: (
      <>
        <p>
          It&apos;s especially useful for families who ski enough that lift tickets,
          passes, trips, lessons, rentals or lodging are a meaningful household
          expense.
        </p>
        <p>
          Families who ski multiple resorts or travel to ski may have even more
          opportunities available.
        </p>
      </>
    ),
  },
  {
    q: "Do I need to live near a ski resort?",
    a: (
      <>
        <p>No.</p>
        <p>Some savings depend on where you live.</p>
        <p>
          Others depend on a child&apos;s age or grade, a resort you&apos;re visiting, an
          existing pass, or other details about your family.
        </p>
      </>
    ),
  },
  {
    q: "What if I already know about some ski discounts?",
    a: (
      <>
        <p>That&apos;s expected.</p>
        <p>
          When you complete your family profile, tell us about programs, passes or
          discounts you&apos;re already using.
        </p>
        <p className="font-semibold text-dark">
          We&apos;re especially interested in uncovering meaningful savings you
          didn&apos;t already know about.
        </p>
      </>
    ),
  },
  {
    q: "Are the estimated savings guaranteed?",
    a: (
      <>
        <p>No.</p>
        <p>Programs, pricing, availability and eligibility rules can change.</p>
        <p>
          We research current published information and source-check the
          opportunities we use to create your Savings Scan.
        </p>
        <p>
          Your result is an estimate of potential savings based on the
          information available and the details you provide.
        </p>
      </>
    ),
  },
  {
    q: "Why are you doing these manually?",
    a: (
      <>
        <p>Because every ski family is different.</p>
        <p>
          Age, grade, location, passes, resorts and travel plans can completely
          change which savings opportunities matter.
        </p>
        <p>
          We&apos;re researching families individually so your Savings Scan reflects
          your actual situation rather than a generic list of ski discounts.
        </p>
      </>
    ),
  },
];

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[4px] focus:bg-accent focus:px-4 focus:py-2 focus:text-dark"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <a href="#hero" className="font-display text-[15px] font-bold tracking-wide text-dark">
            Ski Family Savings
          </a>
          <CtaLink variant="nav">Get My Free Scan</CtaLink>
        </div>
      </header>

      <main id="main" className="pb-24 md:pb-0">
        <Hero />
        <ExampleResult />
        <WhyThisIsHard />
        <HowItWorks />
        <WhatWeSearch />
        <WhoThisIsFor />
        <Trust />
        <Faq />
        <FinalCta />
      </main>

      <footer className="border-t-4 border-accent bg-dark">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <p className="font-display text-[15px] font-bold tracking-wide text-white">Ski Family Savings</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
            Built for families who love skiing and hate paying more than they need to.
          </p>
        </div>
      </footer>

      <StickyMobileCta />
    </>
  );
}

function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden bg-background">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 lg:py-16">
        <div className="max-w-xl">
          <p className="eyebrow">FREE SKI FAMILY SAVINGS SCAN</p>
          <h1 className="mt-4 font-display text-[2.35rem] font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-5xl lg:text-[3.5rem]">
            How much could your family save on skiing this winter?
          </h1>

          <div className="mt-7 space-y-4 text-[17px] leading-relaxed text-muted sm:text-lg">
            <p className="font-semibold text-dark">Skiing with kids has gotten ridiculously expensive.</p>
            <p>
              Luckily, there are all kinds of ways to save that your family may
              qualify for: kids-ski-free programs, grade-school passes, resident
              discounts, family pricing, passholder perks and more.
            </p>
            <p>
              The problem is figuring out which ones actually apply to{" "}
              <em>your</em> family, and which combination could save you the most.
            </p>
            <p>Tell us about your family and how you ski.</p>
            <p className="font-semibold text-dark">
              We&apos;ll manually search for savings your family may qualify for and
              tell you how much potential savings we find.
            </p>
          </div>

          <div className="mt-8">
            <CtaLink>Find My Savings Potential →</CtaLink>
            <p className="mt-3 text-sm text-muted">Free scan. No credit card required.</p>
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-square overflow-hidden rounded-[4px] bg-subtle">
            <Image
              src="/hero.jpg"
              alt="A family of five in ski gear standing together on a sunny mountain ridge"
              fill
              priority
              sizes="(min-width: 1024px) 520px, 100vw"
              className="object-cover object-center"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ExampleResult() {
  const rows = [
    {
      emoji: "🔥",
      title: "3 Jackpot opportunities",
      detail: "Likely savings of $250+ each",
      bar: "bg-accent",
    },
    {
      emoji: "🟢",
      title: "4 Strong opportunities",
      detail: "Likely savings of $50–$250",
      bar: "bg-accent-blue",
    },
    {
      emoji: "🟡",
      title: "5 Useful opportunities",
      detail: "Smaller or more situational savings",
      bar: "bg-[#6a6c69]",
    },
    {
      emoji: "🔔",
      title: "2 programs worth watching",
      detail: "They don't apply yet - but something could change.",
      bar: "bg-border",
    },
  ];

  return (
    <section className="bg-subtle px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">WHAT YOUR FREE SAVINGS SCAN COULD LOOK LIKE</p>
        <h2 className="mt-4 font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl lg:text-[2.85rem]">
          We found $1,240+ in potential ski savings for your family
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-muted">
          Instead of sending you hundreds of generic ski deals, we look at your
          actual family and how you ski.
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-lg overflow-hidden rounded-[4px] border border-border">
        <div className="bg-dark px-6 py-10 text-center sm:px-8 sm:py-14">
          <p className="font-display text-7xl font-bold leading-none tracking-[-0.04em] text-accent sm:text-8xl">
            $1,240+
          </p>
          <p className="mt-4 font-display text-sm font-bold tracking-wide text-white">
            Estimated potential savings
          </p>
        </div>

        <div className="divide-y divide-border bg-background">
          {rows.map((row) => (
            <div key={row.title} className="flex gap-4 px-5 py-4 text-left sm:px-6">
              <span className={`mt-1 h-auto w-1.5 shrink-0 ${row.bar}`} />
              <div>
                <p className="font-display font-bold text-dark">
                  {row.emoji} {row.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{row.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-sm font-semibold leading-relaxed text-dark">
        This is an example. Your results depend on where you live, who&apos;s in your
        family, your kids&apos; ages and grades, where you ski, which passes you
        already own and your plans for the season.
      </p>

      <div className="mt-8 text-center">
        <CtaLink>Find My Savings Potential →</CtaLink>
      </div>
    </section>
  );
}

function WhyThisIsHard() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="rule-gold mb-6" />
        <h2 className="font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl lg:text-[2.6rem]">
          The savings exist. Finding the right ones is the pain in the a$$.
        </h2>
        <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-muted sm:text-lg">
          <p>A 5th grader might qualify for a ski passport covering dozens of mountains.</p>
          <p>
            A younger child might ski free at one resort, but not the mountain next
            door.
          </p>
          <p>
            Your home state might unlock one program, while the state you&apos;re
            traveling to unlocks another.
          </p>
          <p>
            The pass your child buys might unlock a completely different savings
            opportunity for a parent.
          </p>
          <p>
            And the whole thing changes depending on your family&apos;s ages, grades,
            location, passes, ski days and travel plans.
          </p>
          <p className="font-semibold text-dark">No single discount is that complicated.</p>
          <p className="font-semibold text-dark">
            Figuring out which ones actually matter for your family is.
          </p>
          <p>That&apos;s what we look for.</p>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="bg-subtle px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">SIMPLE ON PURPOSE</p>
        <h2 className="mt-4 max-w-xl font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl">
          Three steps. No ski-pass PhD required.
        </h2>

        <div className="mt-14 grid gap-10 lg:grid-cols-3 lg:gap-8">
          <article>
            <p className="font-display text-6xl font-bold leading-none text-accent">1</p>
            <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-dark">
              Tell us about your ski family
            </h3>
            <p className="mt-3 text-[15px] text-muted">We&apos;ll ask things like:</p>
            <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-muted">
              {[
                "Where you live",
                "Your kids' ages and grades",
                "Where you usually ski",
                "Passes you already own",
                "Mountains or regions you're considering",
                "Ski trips you're planning",
                "Whether you need lessons or rentals",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article>
            <p className="font-display text-6xl font-bold leading-none text-accent">2</p>
            <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-dark">
              We do the digging
            </h3>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              A real human manually searches the current ski-savings landscape and
              source-checks the opportunities that appear relevant to your family.
            </p>
          </article>

          <article>
            <p className="font-display text-6xl font-bold leading-none text-accent">3</p>
            <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-dark">
              See how much potential savings we find
            </h3>
            <p className="mt-4 text-[15px] text-muted">
              We&apos;ll send you your <strong className="text-dark">Ski Family Savings Scan</strong> showing:
            </p>
            <ul className="mt-3 space-y-3">
              {[
                "How many Jackpot opportunities we found",
                "Any programs we think are worth keeping an eye on",
                "How many Strong and Useful opportunities we found",
                "Your estimated potential savings",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] font-semibold leading-snug text-dark">
                  <CheckIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="mt-14 text-center">
          <CtaLink>Get My Free Savings Scan →</CtaLink>
          <p className="mt-3 text-sm text-muted">Free. No credit card required.</p>
        </div>
      </div>
    </section>
  );
}

function WhatWeSearch() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="rule-gold mb-6" />
        <h2 className="max-w-xl font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl">
          We look beyond coupon codes.
        </h2>
        <p className="mt-5 text-[17px] text-muted">Depending on your family, we may search for:</p>

        <ul className="mt-10 grid gap-x-10 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {searchItems.map((item) => (
            <li key={item} className="flex items-start gap-3 text-[15px] leading-snug text-dark">
              <CheckIcon />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-12 max-w-xl">
          <h3 className="font-display text-2xl font-bold leading-tight text-dark sm:text-3xl">
            Our goal isn&apos;t to find the most deals.
          </h3>
          <p className="mt-3 font-semibold text-dark">
            It&apos;s to find the savings that actually matter to your family.
          </p>
        </div>
      </div>
    </section>
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

function WhoThisIsFor() {
  return (
    <section className="bg-subtle">
      <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
        <h2 className="font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl">
          Especially useful if your family skis enough to feel it.
        </h2>
        <p className="mt-6 text-[17px] leading-relaxed text-muted">
          The Ski Family Savings Scan is especially useful for families who:
        </p>
        <ul className="mt-6 space-y-3">
          {whoItems.map((item) => (
            <li key={item} className="flex items-start gap-3 text-[17px] leading-snug text-dark">
              <CheckIcon />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 font-semibold text-dark">You don&apos;t need to check every box.</p>
        <p className="mt-3 text-[17px] leading-relaxed text-muted">
          If skiing is a meaningful family expense, we&apos;ll see what we can find.
        </p>
        <div className="mt-10">
          <CtaLink>Find My Savings Potential →</CtaLink>
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <p className="eyebrow">YES, A HUMAN IS ACTUALLY DOING THIS</p>
        <h2 className="mt-4 font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl">
          Your family&apos;s scan isn&apos;t coming from a generic coupon list.
        </h2>
        <p className="mt-8 text-[17px] leading-relaxed text-muted sm:text-lg">
          That means we&apos;re actually looking at your family&apos;s ages, grades,
          location, passes, ski plans and other details to search for savings that
          appear relevant to <strong className="text-dark">you</strong>.
        </p>
        <p className="mt-5 text-[17px] leading-relaxed text-muted sm:text-lg">
          Then we source-check what we find.
        </p>
        <div className="mt-10">
          <CtaLink>Get My Free Savings Scan →</CtaLink>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="bg-subtle">
      <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="divide-y divide-border border-y border-border">
          {faqs.map((item) => (
            <details key={item.q} className="faq-item group py-1">
              <summary className="flex cursor-pointer items-start justify-between gap-6 py-5 text-left font-display text-[17px] font-bold tracking-tight text-dark">
                <span>{item.q}</span>
                <span
                  className="faq-icon mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background text-lg leading-none text-muted transition"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <div className="space-y-3 pb-5 pr-12 text-[15px] leading-relaxed text-muted">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section id="final-cta" className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/cta-family.jpg"
          alt="A parent and child enjoying a snowy day on the mountain"
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-dark/80" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="max-w-xl text-white">
          <h2 className="font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] sm:text-4xl lg:text-[2.75rem]">
            Let&apos;s find out how much your family could save.
          </h2>
          <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-white/85">
            <p>Tell us about your family and how you ski.</p>
            <p className="font-semibold text-white">
              We&apos;ll do the digging and tell you how much potential savings we find.
            </p>
          </div>
          <div className="mt-9">
            <CtaLink variant="onDark">Find My Savings Potential →</CtaLink>
            <p className="mt-3 text-sm text-white/75">Free scan. No credit card required.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
