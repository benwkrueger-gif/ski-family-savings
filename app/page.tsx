import Image from "next/image";
import { CtaLink } from "@/components/CtaLink";
import { StickyMobileCta } from "@/components/StickyMobileCta";

const searchAreas = [
  {
    heading: "Kids & family programs",
    body: "Kids-ski-free offers, age-based passes, grade-school passports and family programs.",
  },
  {
    heading: "Season passes",
    body: "Whether there are cheaper or less-obvious ways to cover the mountains you actually plan to ski.",
  },
  {
    heading: "Multi-mountain access",
    body: "Reciprocal benefits, partner resorts and access you may already have without realizing it.",
  },
  {
    heading: "Lift-ticket deals",
    body: "Local programs, resident offers, advance pricing and other alternatives to buying regular day tickets.",
  },
  {
    heading: "Lessons & rentals",
    body: "Youth programs, bundles, seasonal rentals and other ways those costs can sometimes come down.",
  },
  {
    heading: "Ski trips",
    body: "Existing pass access, destination programs, transportation or other trip-specific savings.",
  },
  {
    heading: "Timing",
    body: "Deadlines, price jumps and programs where when you buy matters almost as much as what you buy.",
  },
];

const whoItems = [
  "You have kids skiing or snowboarding.",
  "You ski more than one mountain.",
  "You're comparing passes.",
  "You take a ski trip or two each winter.",
  "Your kids do lessons or need rentals.",
  "You're already spending a few thousand bucks a season.",
  "You sometimes have the nagging feeling that there's probably a cheaper way to do all this.",
];

const faqs = [
  {
    q: "Is this actually free?",
    a: (
      <>
        <p>Yep.</p>
        <p>
          There&apos;s no credit card required to have me look at your family and
          tell you whether I find meaningful potential savings.
        </p>
      </>
    ),
  },
  {
    q: "What exactly do I get from the free scan?",
    a: (
      <>
        <p>
          I&apos;ll tell you whether I found savings worth pursuing, give you an
          estimated savings range, and show you the general areas where the
          biggest opportunities appear to be hiding.
        </p>
        <p>It&apos;s meant to answer:</p>
        <p className="font-semibold text-dark">
          &ldquo;Is there actually enough money here to care about?&rdquo;
        </p>
        <p>
          The free scan is not a giant list of every exact program, eligibility
          rule and source link I researched.
        </p>
      </>
    ),
  },
  {
    q: "Why do you need so much information about my family?",
    a: (
      <p>
        Because otherwise I&apos;m just making a generic list of ski discounts.
        Your ZIP code, kids&apos; ages/grades, passes, mountains, trips and other
        plans are what let me figure out which opportunities might actually apply
        to you.
      </p>
    ),
  },
  {
    q: "How long does it take?",
    a: (
      <>
        <p>The form takes around 5 minutes.</p>
        <p>I&apos;m currently aiming to get scans back within 2 business days.</p>
        <p>
          If a bunch of ski parents suddenly bury me in submissions, it might
          take a little longer. I&apos;ll keep you posted.
        </p>
      </>
    ),
  },
  {
    q: "Is this only for Vermont families?",
    a: (
      <>
        <p>
          I&apos;m starting heavily in Vermont and New England because that&apos;s
          where I live and ski.
        </p>
        <p>
          But if you&apos;re a New England family taking trips elsewhere,
          definitely include those. Some of the biggest savings can show up
          around destination trips.
        </p>
      </>
    ),
  },
  {
    q: "Are the savings guaranteed?",
    a: (
      <>
        <p>Nope.</p>
        <p>
          Programs change, inventory disappears, dates matter and eligibility
          rules can get weird.
        </p>
        <p>
          I use current sources and try not to count anything that looks shaky,
          but the number I send you is still an estimate of potential savings,
          not money already sitting in your bank account.
        </p>
      </>
    ),
  },
  {
    q: "What if you don't find anything good?",
    a: <p>Then I&apos;ll tell you.</p>,
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
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <a href="#hero" className="font-display text-[15px] font-bold tracking-wide text-dark">
            SKI FAMILY SAVINGS
          </a>
          <CtaLink ctaLocation="header" variant="nav">
            See what I can find →
          </CtaLink>
        </div>
      </header>

      <main id="main" className="pb-24 md:pb-0">
        <Hero />
        <ExampleResult />
        <WhyThisExists />
        <HowItWorks />
        <WhatISearch />
        <WhoThisIsFor />
        <Founder />
        <Faq />
        <FinalCta />
      </main>

      <footer className="border-t-4 border-accent bg-dark">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <p className="font-display text-[15px] font-bold tracking-wide text-white">
            SKI FAMILY SAVINGS
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
            A little ski-family savings experiment made in Vermont.
          </p>
          <p className="mt-4 text-sm text-white/70">Contact:</p>
          <p className="mt-1 text-sm">
            <a
              href="mailto:ben@skifamilysavings.com"
              className="text-accent hover:text-accent-hover"
            >
              ben@skifamilysavings.com
            </a>
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
          <p className="eyebrow">A LITTLE SKI-DAD EXPERIMENT</p>
          <h1 className="mt-4 font-display text-[2.35rem] font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-5xl lg:text-[3.5rem]">
            Skiing with kids is stupid expensive.
          </h1>
          <p className="mt-4 font-display text-xl font-bold text-dark sm:text-2xl">
            I&apos;m trying to make it a little less so.
          </p>

          <div className="mt-7 space-y-4 text-[17px] leading-relaxed text-muted sm:text-lg">
            <p>
              I&apos;m Ben, a ski dad in Vermont. I started digging into all the
              weird kids programs, grade-school passports, pass deals, resort
              discounts and other ways families can save, and realized this stuff
              is scattered all over the place.
            </p>
            <p className="font-semibold text-dark">So I&apos;m testing something simple:</p>
            <p>
              Tell me a little about your family and how you ski. I&apos;ll start
              digging and tell you if I find meaningful savings.
            </p>
            <p className="font-semibold text-dark">For free.</p>
          </div>

          <div className="mt-8">
            <CtaLink ctaLocation="hero">
              See what you can find for my family →
            </CtaLink>
            <p className="mt-3 text-sm text-muted">Takes about 5 minutes. No spammy sales nonsense.</p>
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
      detail: "Likely savings of $50-$250",
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
        <p className="eyebrow">WHAT COMES BACK</p>
        <h2 className="mt-4 font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl lg:text-[2.85rem]">
          Sometimes there&apos;s real money hiding in there.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-muted">
          For one test family, the digging turned up $1,240+ in potential ski
          savings worth looking into.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-muted">
          Not generic &ldquo;ski on weekdays!&rdquo; advice. Actual programs,
          pass options and family-specific opportunities that appeared relevant
          to how they ski.
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

      <div className="mx-auto mt-8 max-w-2xl space-y-4 text-center text-[17px] leading-relaxed text-muted">
        <p>
          The free scan gives you the big picture: whether I found worthwhile
          savings, roughly how much, and where the biggest opportunities appear
          to be hiding.
        </p>
        <p>
          It&apos;s not a giant coupon dump. The whole point is figuring out what
          looks relevant to your family.
        </p>
      </div>

      <div className="mt-8 text-center">
        <CtaLink ctaLocation="example_result">
          See what you can find for us →
        </CtaLink>
      </div>
    </section>
  );
}

function WhyThisExists() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="eyebrow">WHY THIS EXISTS</p>
        <h2 className="mt-4 font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl lg:text-[2.6rem]">
          The annoying part isn&apos;t that ski savings don&apos;t exist.
        </h2>
        <p className="mt-4 font-display text-xl font-bold text-dark sm:text-2xl">
          It&apos;s that they&apos;re scattered everywhere.
        </p>
        <div className="mt-8 space-y-4 text-[17px] leading-relaxed text-muted sm:text-lg">
          <p>There are kids-ski-free programs.</p>
          <p>Grade-school passports.</p>
          <p>Cheap little-kid passes buried on resort websites.</p>
          <p>Resident deals.</p>
          <p>Pass-holder perks.</p>
          <p>Reciprocal mountain access.</p>
          <p>Lesson and rental offers.</p>
          <p>Early-purchase deadlines.</p>
          <p>
            And a bunch of weird little programs you&apos;d probably never search
            for because you don&apos;t know they exist.
          </p>
          <p>Individually, none of this is rocket science.</p>
          <p>The pain in the ass is figuring out:</p>
          <p className="font-semibold text-dark">
            Which of this stuff actually applies to my family?
          </p>
          <p>That&apos;s the part I&apos;m trying to solve.</p>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="bg-subtle px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">PRETTY SIMPLE</p>
        <h2 className="mt-4 max-w-xl font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl">
          Three steps.
        </h2>

        <div className="mt-14 grid gap-10 lg:grid-cols-3 lg:gap-8">
          <article>
            <p className="font-display text-6xl font-bold leading-none text-accent">1</p>
            <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-dark">
              Tell me how your family skis.
            </h3>
            <p className="mt-3 text-[15px] text-muted">Things like:</p>
            <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-muted">
              {[
                "where you live",
                "your kids' ages and grades",
                "where you normally ski",
                "passes you already have or are considering",
                "trips you're planning",
                "lessons, rentals, etc.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Basically the stuff that changes which deals actually matter.
            </p>
          </article>

          <article>
            <p className="font-display text-6xl font-bold leading-none text-accent">2</p>
            <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-dark">
              I start digging.
            </h3>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-muted">
              <p>
                I dig through the current programs, passes, resort offers and
                other savings that seem relevant to your family.
              </p>
              <p>
                Right now I&apos;m doing these mostly by hand because I&apos;m still
                learning where the good stuff hides.
              </p>
            </div>
          </article>

          <article>
            <p className="font-display text-6xl font-bold leading-none text-accent">3</p>
            <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-dark">
              I tell you if there&apos;s money hiding there.
            </h3>
            <p className="mt-4 text-[15px] text-muted">You&apos;ll get a simple readout showing:</p>
            <ul className="mt-3 space-y-3">
              {[
                "roughly how much potential savings I found",
                "where the biggest opportunities seem to be",
                "anything important I'd want to double-check",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] font-semibold leading-snug text-dark">
                  <CheckIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">And if I don&apos;t find much?</p>
            <p className="mt-2 text-[15px] font-semibold text-dark">I&apos;ll tell you that too.</p>
          </article>
        </div>

        <div className="mt-14 text-center">
          <CtaLink ctaLocation="how_it_works">Alright, poke around →</CtaLink>
        </div>
      </div>
    </section>
  );
}

function WhatISearch() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="eyebrow">THE RABBIT HOLE</p>
        <h2 className="mt-4 max-w-xl font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl">
          What am I actually looking for?
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {searchAreas.map((item) => (
            <article key={item.heading} className="border border-border bg-subtle p-5 sm:p-6">
              <h3 className="font-display text-lg font-bold text-dark">{item.heading}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{item.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 max-w-xl">
          <p className="font-display text-xl font-bold text-dark">One important rule:</p>
          <p className="mt-3 text-[17px] leading-relaxed text-muted">
            I don&apos;t want to pretend I &ldquo;found&rdquo; money you already knew
            about.
          </p>
          <p className="mt-3 font-semibold text-dark">
            The interesting stuff is the savings you probably wouldn&apos;t have
            found on your own.
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
        <p className="eyebrow">IS THIS ACTUALLY FOR YOU?</p>
        <h2 className="mt-4 font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl">
          This gets more interesting when your family&apos;s ski life is a little complicated.
        </h2>
        <p className="mt-6 text-[17px] leading-relaxed text-muted">
          It&apos;s probably especially useful if:
        </p>
        <ul className="mt-6 space-y-3">
          {whoItems.map((item) => (
            <li key={item} className="flex items-start gap-3 text-[17px] leading-snug text-dark">
              <CheckIcon />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-12 border-t border-border pt-10">
          <h3 className="font-display text-xl font-bold text-dark sm:text-2xl">
            You probably don&apos;t need me if...
          </h3>
          <p className="mt-4 text-[17px] leading-relaxed text-muted">
            You ski one inexpensive local hill, already know all of its
            family/kid programs, don&apos;t really travel, and have your setup
            dialed.
          </p>
          <p className="mt-4 text-[17px] leading-relaxed text-muted">
            There just may not be enough hiding there to make this particularly
            interesting.
          </p>
        </div>

        <div className="mt-10">
          <CtaLink ctaLocation="who_its_for">
            Okay, my ski life is complicated →
          </CtaLink>
        </div>
      </div>
    </section>
  );
}

function Founder() {
  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-6xl items-start gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
        {/* Swap public/founder.jpg with a casual personal ski/family photo. */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-subtle">
            <Image
              src="/founder.jpg"
              alt="Ben, a ski dad in Vermont"
              fill
              sizes="(min-width: 1024px) 420px, 100vw"
              className="object-cover object-center"
            />
          </div>
        </div>

        <div>
          <p className="eyebrow">HI, I&apos;M BEN 👋</p>
          <h2 className="mt-4 font-display text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-dark sm:text-4xl">
            This is basically a ski-dad rabbit hole that got out of hand.
          </h2>
          <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-muted sm:text-lg">
            <p>
              I live in Vermont with my wife and kids, and skiing and snowboarding
              are a big part of our winters.
            </p>
            <p>
              I started looking into all this for my own family and kept finding
              these strange little programs, discounts and pass options buried in
              different corners of the internet.
            </p>
            <p>
              At the same time, I kept hearing other parents talk about how
              insanely expensive skiing with a family has become. And once you add
              together passes, lift tickets, lessons, rentals, trips and trying to
              figure out which kid qualifies for what, the whole thing can feel
              like a total clusterf*ck.
            </p>
            <p>And eventually I thought:</p>
            <p className="font-semibold text-dark">
              How much could I save a family if I actually looked through all of
              it for them?
            </p>
            <p>So that&apos;s what I&apos;m testing.</p>
            <p>
              There isn&apos;t some giant Ski Family Savings corporation behind the
              curtain. It&apos;s me.
            </p>
            <p>
              I&apos;m personally looking at these scans, building up a database of
              what I find, and figuring out whether this is useful enough to turn
              into something bigger.
            </p>
            <p>Sometimes I&apos;ll probably find a lot.</p>
            <p>Sometimes I won&apos;t.</p>
            <p>
              Either way, I&apos;d rather tell you the truth than manufacture a
              giant &ldquo;savings&rdquo; number just to make this look impressive.
            </p>
            <p>And if this whole experiment eventually goes nowhere?</p>
            <p>
              Hopefully at least a few ski families spend less money this winter.
            </p>
            <p>That seems like a pretty decent outcome.</p>
          </div>
          <div className="mt-10">
            <CtaLink ctaLocation="founder">Let Ben dig through mine →</CtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="bg-subtle">
      <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="eyebrow">QUESTIONS YOU MIGHT REASONABLY HAVE</p>
        <h2 className="mt-4 font-display text-3xl font-bold tracking-[-0.02em] text-dark sm:text-4xl">
          The fine print, minus most of the fine print.
        </h2>
        <div className="mt-10 divide-y divide-border border-y border-border">
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
            Want me to see what I can find?
          </h2>
          <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-white/85">
            <p>Tell me how your family skis and I&apos;ll go poke around.</p>
            <p>Worst case, I don&apos;t find much and we both learn something.</p>
            <p>Best case?</p>
            <p className="font-semibold text-white">
              There&apos;s a surprising amount of money hiding in there.
            </p>
          </div>
          <div className="mt-9">
            <CtaLink ctaLocation="final_cta" variant="onDark">
              See what you can find for my family →
            </CtaLink>
            <p className="mt-3 text-sm text-white/75">Free • About 5 minutes</p>
          </div>
        </div>
      </div>
    </section>
  );
}
