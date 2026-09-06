# Ski Family Savings Scan

A Next.js site for the Ski Family Savings Scan landing page, plus the automated report pipeline that turns Tally submissions into branded PDFs, Gmail drafts, and paid fulfillment.

## Landing page

Every primary CTA still opens `TALLY_FORM_URL` from [`lib/config.ts`](lib/config.ts).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Report pipeline

The pipeline lives behind `/admin` and `/api/webhooks/*`. Copy [`.env.example`](.env.example), fill in secrets, then:

```bash
npm run db:migrate
npm run dev
```

Open [http://localhost:3000/admin/submissions](http://localhost:3000/admin/submissions).

Offer-mode threshold: [`config/compelling-savings.ts`](config/compelling-savings.ts) (`COMPELLING_SAVINGS_MIN`, default `$100` conservative core savings).

Existing branded PDF templates are unchanged: [`reports/templates/FreeScanReport.tsx`](reports/templates/FreeScanReport.tsx) and [`reports/templates/FullReport.tsx`](reports/templates/FullReport.tsx).

Manual PDF generation from JSON still works:

```bash
npm run report:latest
```

## Deploy

Vercel is the expected host. You need a Postgres database (Neon works), the env vars from `.env.example`, and a Vercel plan that allows long-running functions for PDF generation (300s on the OpenAI webhook / admin PDF routes).

Do not point the live Tally webhook at production until Google, Stripe test mode, and one historical submission have been verified end to end.

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

## Generating a customer report

1. Save completed customer JSON into `reports/data/`
2. Run `npm run report:latest`
3. PDFs appear in `reports/output/`

## Deploy to Vercel (simplest)

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo, and click Deploy.

Or from this folder, with the Vercel CLI:

```bash
npx vercel
```

Accept the defaults. Framework preset should be Next.js. Add the env vars from `.env.example` before turning on the live Tally webhook.
