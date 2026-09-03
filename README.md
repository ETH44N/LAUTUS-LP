# Lautus — coming soon

The holding page for [lautus.ai](https://lautus.ai): white, soft blue blurs, navy type, cherry accents, one glass card. Everything centered.
Plain HTML/CSS/JS — no build step, no framework, deploys anywhere that serves static files.

```
index.html        markup + copy
styles.css        theme, glass, layout, motion
script.js         signup form
og.html           layout used to render og.png (not linked from the site)
og.png            social share image (1200×630)
brand/            logo assets (see below)
fonts/            General Sans Medium (wordmark), self-hosted
favicon.ico, favicon-16/32/48.png, apple-touch-icon.png, icon-192/512.png, site.webmanifest
CNAME             custom domain for GitHub Pages
```

## Brand assets

`brand/source/` holds the two original renders (lotus on white, app icon). Everything else is derived:

- `brand/lautus-lotus.png` / `.webp` — lotus with real transparency (white keyed to alpha), 1000px wide.
- `brand/lautus-lotus-480.png` / `.webp` — same, sized for the page header.
- `brand/lautus-icon-512.png` — simplified icon with rounded corners cut out.
- Root favicons, Apple touch icon (opaque, full-bleed) and PWA icons are resized from the icon.
- Wordmark: `lautus.ai` in General Sans Medium, 0.16em tracking, navy — see `.lockup__wordmark` in `styles.css`.

To regenerate `og.png`, serve the folder and screenshot `og.html` at 1200×630.

## Run locally

```bash
python3 -m http.server 8790
```

Then open http://127.0.0.1:8790.

## Signups (Supabase)

The form POSTs `{ email, source, referrer }` to the `lautus-waitlist` Edge Function in the
Supabase project `vakvqlyvvaxpqabewtei`, with the project's publishable key (safe to ship in the
browser). The function validates the address, drops honeypot submissions, and inserts into
`public.lautus_waitlist` using the service role. The table has RLS on with no policies, so nothing
in the browser can read it. Duplicate emails return `{ ok: true, duplicate: true }` and the page
shows "You're already on the list."

**Notification email.** After each insert the function emails `crapo2025@gmail.com` through
Resend when a key is available: either the `RESEND_API_KEY` function secret, or a Vault secret
named `resend_api_key`:

```sql
select vault.create_secret('re_xxxxxxxxx', 'resend_api_key');
```

Without a key, signups are still stored and the function logs "notification skipped".
Override the recipient/sender with the `LAUTUS_NOTIFY_EMAIL` / `LAUTUS_NOTIFY_FROM` secrets.

**Viewing signups:** Supabase dashboard → Table editor → `lautus_waitlist`, or

```sql
select email, source, created_at, notified_at from public.lautus_waitlist order by created_at desc;
```

Function source lives in `supabase/functions/lautus-waitlist/index.ts`.

## Deploy

- **GitHub Pages** — Settings → Pages → deploy from `main` / root. `CNAME` already points at `lautus.ai`;
  add the DNS records GitHub shows you.
- **Vercel / Netlify / Cloudflare Pages** — import the repo, framework "Other", no build command, output `/`.

## Customize

- Copy lives in `index.html` (headline, lede, footer).
- Colors are CSS variables at the top of `styles.css` (`--navy`, `--blue`, `--cherry*`).
- Fonts: Syne (display), Hanken Grotesk (body), Azeret Mono (labels), loaded from Google Fonts.
- Motion respects `prefers-reduced-motion`.
