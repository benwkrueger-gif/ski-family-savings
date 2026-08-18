# Ski Family Savings Scan

A single-page landing site for a manual beta: get ski families to complete a Tally intake form for a free personalized Ski Family Savings Scan.

No accounts, dashboard, database, or backend. Static Next.js + Tailwind. Every CTA opens `TALLY_FORM_URL`.

## Change the Tally form URL

Open [`lib/config.ts`](lib/config.ts) and replace the placeholder:

```ts
export const TALLY_FORM_URL = "https://tally.so/r/REPLACE_ME";
```

That value is used by every primary CTA on the page.

## Replace the hero photo

The current hero is the family-on-the-ridge ski photo at:

`public/hero.jpg`

Drop in a landscape (or portrait) family-skiing photo with the same filename if you have a preferred shot. The final CTA uses `public/cta-family.jpg`.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel (simplest)

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo, and click Deploy.

Or from this folder, with the Vercel CLI:

```bash
npx vercel
```

Accept the defaults. Framework preset should be Next.js. No environment variables are required unless you later move the Tally URL into one.
