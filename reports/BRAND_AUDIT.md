# Ski Family Savings — brand audit

Source of truth: `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `app/scan-in-progress/page.tsx`, `components/CtaLink.tsx`, `app/opengraph-image.tsx`.

Do not invent new visual language. Reports reuse these tokens and patterns.

## Fonts

- Display: **Oswald** (`--font-oswald` / `font-display`), weight 700. Occasional 500–600 for labels.
- Body: **Barlow** (`--font-barlow` / `font-sans`), weights 400, 500, 600, 700.
- Body size: 17px (`1.0625rem`) at 1.55 line-height.

## Typography hierarchy

- **Eyebrow:** Oswald 12px / 700 / `letter-spacing: 0.06em` / `#007db7` (`.eyebrow`)
- **H1:** Oswald ~2.35rem–3.5rem / 700 / `leading-[0.95]` / `tracking-[-0.02em]` / `#092340`
- **H2:** Oswald 1.875rem–2.85rem, same leading/tracking
- **H3:** Oswald ~1.25rem–1.5rem / 700
- **Savings number:** Oswald 4.5rem–6rem / 700 / `tracking-[-0.04em]` / gold on navy
- **Body:** Barlow 17px / `#575757`; emphasis uses `font-semibold text-dark`
- **Small:** 15px or `text-sm` (14px), still `#575757`
- **Wordmark:** Oswald 15px / 700 / `tracking-wide`

## Color

| Token | Hex | Use |
|---|---|---|
| background | `#ffffff` | Default sections |
| subtle | `#f4f4f4` | Alternating sections |
| dark / text | `#092340` | Navy type, dark bands, footer |
| muted | `#575757` | Body copy |
| accent | `#ffc72c` | Gold: CTAs, rules, hero numbers, Jackpot bar |
| accent-hover | `#e6b326` | Button hover |
| accent-blue | `#007db7` | Eyebrows, check icons, Strong bar, links |
| border | `#d9d9d6` | Hairline borders, Watch bar |
| useful bar | `#6a6c69` | Useful tier (site uses arbitrary `bg-[#6a6c69]`) |

Selection color: gold background, navy text. No extra palette.

## Spacing

- Page gutter: `px-5` / `sm:px-8`
- Section padding: `py-20` / `sm:py-28` (tighter `py-16` on scan-in-progress)
- Content widths: `max-w-6xl`, `max-w-3xl`, `max-w-lg` for scorecards
- Header height: 72px
- Stack: `mt-4` after eyebrows, `mt-7`–`mt-8` after headlines, `space-y-4` / `space-y-5` for body

## Radius, borders, shadow

- Radius is **4px everywhere** (`rounded-[4px]`). Never pill-shaped.
- Hairline: `border border-border`
- Gold rule: 3rem × 4px, gold (`.rule-gold`)
- Footer rule: `border-t-4 border-accent`
- **No box-shadows** on site components. Do not add card shadows in reports.

## Cards

- Scorecard: `rounded-[4px] border border-border`, navy header, white rows divided by `divide-y divide-border`
- Row accent: 6px (`w-1.5`) left bar in the tier color
- Dark callout: `bg-dark` with gold Oswald number
- Highlight phrase: `inline-block bg-accent` + navy Oswald (scan-in-progress)

## Labels / badges / tiers

Site language, including emoji:

| Tier | Emoji | Bar | Meaning |
|---|---|---|---|
| Jackpot | 🔥 | gold | $250+ |
| Strong | 🟢 | blue | $50–$250 |
| Useful | 🟡 | `#6a6c69` | smaller / situational |
| Watch | 🔔 | border gray | not counted yet |

## Buttons / CTAs

Oswald bold, `tracking-wide`, navy on gold, 4px radius, no shadow.

- Primary: `bg-accent px-8 py-4 text-base`
- Nav: `px-5 py-2.5 text-sm`
- Hover: `bg-accent-hover`
- On photography: gold button over `bg-dark/80` image overlay

## Imagery

- `public/hero.jpg` — family on a sunny ridge, square crop, `object-cover`, 4px clip
- `public/cta-family.jpg` — parent + child in snow, full-bleed under `bg-dark/80`
- No gradients except that navy overlay. No stock substitutions.

## Motifs

- Gold square next to wordmark (Open Graph treatment)
- Gold 4px rule above editorial headlines
- Huge gold Oswald step numbers (`1` `2` `3`)
- Circle-check in accent-blue
- Gold 4×4px square bullets
- Alternating white / `#f4f4f4` sections
- Navy footer, gold top border, muted white tagline

## Tone

Human, direct, useful, slightly irreverent. Short sentences. “We” and “I’d.” Never consultant-speak. Brand lines already on the site: *No single discount is that complicated. Figuring out which ones actually matter for your family is.* / *The goal isn’t to find the most deals.* / *That’s it. We’ll do the digging from here.*
