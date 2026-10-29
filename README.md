# Lautus — landing page

The pre-launch landing page for [lautus.ai](https://lautus.ai). Since 2026-10-26 it wears the
**pixel studio** look shared with the Lautus studio and app: a warm off-white ground, hairlines, square
corners, square ink buttons that turn blue, Bricolage Grotesque titles, Instrument Sans text, DM Mono
labels, a pixel lotus (`brand/lautus-lotus-pixel.svg`) and a few pixel blocks that drop into the hero
in steps (the "Pixel studio" block at the end of `styles.css`). Cherry "clip selection" accents, one
dark showcase panel. Layout language borrowed from
[clickway.fr](https://www.clickway.fr/): floating nav, a highlighted word in the hero, bento cards in a
dashed frame, numbered steps, a dark panel of examples, FAQ split, dark CTA card, giant-wordmark footer.

Plain HTML/CSS/JS — no build step, no framework, deploys anywhere that serves static files.

```
index.html        markup + copy (every section)
styles.css        tokens, components, sections, motion, responsive
script.js         waitlist forms + interface touches (button letter roll, nav, reveals, waveforms, timecode)
og.html           layout used to render og.png (not linked from the site)
og.png            social share image (1200×630)
brand/            logo assets (see below)
fonts/            General Sans Medium (wordmark fallback), self-hosted
favicon.ico, favicon-16/32/48.png, apple-touch-icon.png, icon-192/512.png, site.webmanifest
CNAME             custom domain for GitHub Pages
```

## Page sections

| Section | id | Notes |
| --- | --- | --- |
| Nav | – | Floating bar with Log in and Sign up (app.lautus.ai `/signin`, `/signup`); collapses to a menu under 860px. |
| Hero | `#top` | Headline with the dashed "finds" selection, waitlist form, formats marquee, editor mock with two shorts. |
| Editing styles | `#styles` | Four studio styles (Emotional, Floating captions, Glowing serif, Vintage camera) in one player: each real render plays to its end, then the next takes over; a click picks one. Clips in `media/styles/`, loaded when the section is on screen. |
| Creators | `#creators` | Two rows of creator cards drifting in opposite directions. **All names, handles and numbers are placeholders** — replace them with real creators before deploying. |
| Product | `#product` | Sticky intro + bento of what the editor does, inside a dashed "editor" frame. |
| How it works | `#how` | Four numbered steps with small UI mocks. |
| Examples | `#examples` | Tabbed before/after (podcast, keynote, interview): the 16:9 source, then the Standard and Premium shorts. |
| Use cases | `#use-cases` | Dark panel, six cards (podcasts, keynotes, webinars, interviews, lectures, livestreams). |
| Compare | – | "By hand" vs "With Lautus". |
| Pricing | `#pricing` | Starter $49 (30 videos), Pro $199 (100, premium edit), Scale $499 (300), Enterprise. Buttons use `CHECKOUT` in `script.js`. |
| FAQ | `#faq` | `<details name="faq">` accordion (one open at a time). |
| Final CTA | `#access` | Second waitlist form. Every "Get early access" link focuses a form. |
| Footer | – | Links, a live local-time timecode, giant wordmark. |

All product visuals (editor, shorts, waveforms) are HTML/CSS/SVG, no images or video. Speaker silhouettes
are one SVG symbol (`#person`); backdrops are the `.sc-1` … `.sc-6` classes. The hero mock scales with
its own width via container units (`cqw`).

## Checkout

The Starter, Pro and Scale buttons open the customer app (`apps/app` in the `lautus` repo):
`https://app.lautus.ai/start?plan=<plan>`, or `http://localhost:3001/...` when this page is served
locally. There the visitor signs in with Google and pays with Whop's embedded checkout. Links live in
`CHECKOUT` at the top of `script.js`; a plan left empty (Enterprise, for now) falls back to the
early-access form, and that signup's `source` gets `· plan: <name>` appended.

## Brand assets

`brand/source/` holds the two original renders (lotus on white, app icon). Everything else is derived:

- `brand/lautus-lotus.png` / `.webp` — lotus with real transparency (white keyed to alpha), 1000px wide.
- `brand/lautus-lotus-480.png` / `.webp` — same, 480px.
- `brand/lautus-lotus-160.png` / `.webp` — same, 160px, for the nav, chips and footer.
- `brand/lautus-icon-512.png` — simplified icon with rounded corners cut out.
- Root favicons, Apple touch icon (opaque, full-bleed) and PWA icons are resized from the icon.
- Wordmark: `lautus.ai` in General Sans Medium, 0.16em tracking, navy — see `.brand__word` in `styles.css`.

## Run locally

```bash
python3 -m http.server 8790
```

Then open http://127.0.0.1:8790.

## Signups (Supabase)

Both forms (hero and final CTA) POST `{ email, source, referrer }` to the `lautus-waitlist` Edge Function
in the Supabase project `vakvqlyvvaxpqabewtei`, with the project's publishable key (safe to ship in the
browser). `source` is `lautus.ai · hero` or `lautus.ai · footer cta` (from each form's `data-source`), so
you can see which form converts. Signing up in one form marks both as done.

The function validates the address, drops honeypot submissions, and inserts into
`public.lautus_waitlist` using the service role. The table has RLS on with no policies, so nothing
in the browser can read it. Duplicate emails return `{ ok: true, duplicate: true }` and the page
shows "You're already on the list."

**Notification email.** After each insert the function emails `crapo2025@gmail.com` from
`lautus@mansionmastermind.fr` (a verified Resend domain). The Resend key is stored as a Vault
secret named `resend_api_key` (a `RESEND_API_KEY` function secret also works). To rotate it:

```sql
select vault.create_secret('re_xxxxxxxxx', 'resend_api_key');
```

Without a key, signups are still stored and the function logs "notification skipped". Rotating: `select vault.update_secret(id, 're_new...') from vault.secrets where name = 'resend_api_key';`
Override the recipient/sender with the `LAUTUS_NOTIFY_EMAIL` / `LAUTUS_NOTIFY_FROM` secrets.

**Viewing signups:** Supabase dashboard → Table editor → `lautus_waitlist`, or

```sql
select email, source, created_at, notified_at from public.lautus_waitlist order by created_at desc;
```

Function source lives in `supabase/functions/lautus-waitlist/index.ts`.

## Tracking and cookie consent

`lautus-consent.js` is the cookie banner and the analytics and ad tools behind it: Google Analytics 4 and
Microsoft Clarity ("analytics"), Meta Pixel, TikTok Pixel, Google Ads and FirstPromoter ("marketing").
Visitors from the EU/EEA, the UK and Switzerland (by browser time zone here) see the banner and nothing loads
before their yes; "Reject all" sits next to "Accept all". Everyone else gets the tools at once, no banner. The answer is the
`lautus_consent` cookie on `.lautus.ai`, shared with app.lautus.ai and the studio, asked again after 6 months.
The footer's "Cookies" link (`data-cookie-settings`) reopens the choices.

The ids go in `window.LAUTUS_TRACKING` in the `<head>` of `index.html`; a tool left empty stays off and with
every id empty there is no banner. `lautus-consent.js` is the same file as `apps/app/public/lautus-consent.js`
in the `LAUTUS-BACK` repo (which also sends sign-ups and purchases); copy it here when it changes. This page
sends `begin_checkout` on a pricing button and `lead` on the paste-a-link form.

## Share image

`og.html` reuses the page's components. Serve the folder, then render it at 1200×630, e.g. with any
Chromium browser:

```bash
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --headless=new --disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars --force-device-scale-factor=1 --user-data-dir=/tmp/lautus-og --window-size=1200,630 --timeout=5000 --screenshot=og.png http://127.0.0.1:8790/og.html
```

## Deploy

- **GitHub Pages** — Settings → Pages → deploy from `main` / root. `CNAME` already points at `lautus.ai`;
  add the DNS records GitHub shows you.
- **Vercel / Netlify / Cloudflare Pages** — import the repo, framework "Other", no build command, output `/`.

## Customize

- Copy lives in `index.html`.
- Colors are CSS variables at the top of `styles.css` (`--ink`, `--blue`, `--cherry*`, `--night`, `--paper`).
- Fonts: General Sans 400–700 from Fontshare (everything), Azeret Mono from Google Fonts (timecodes, labels).
  The self-hosted General Sans Medium in `fonts/` is a fallback for the wordmark.
- Motion respects `prefers-reduced-motion`. Decorative loops pause while their section is off screen.
