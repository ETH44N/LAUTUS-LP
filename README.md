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

## Connect the email form

The form POSTs JSON `{ "email": "...", "source": "lautus.ai coming-soon" }` to `FORM_ENDPOINT`
at the top of `script.js`. Until you set it, the form shows an "isn't connected yet" notice.

| Service | What to do |
| --- | --- |
| **Formspree** (free tier, zero backend) | Create a form at formspree.io, paste the `https://formspree.io/f/xxxx` URL. Works as-is. |
| **Buttondown** | Use `https://api.buttondown.email/v1/subscribers` and add an `Authorization: Token …` header in the fetch call. |
| **Netlify Forms** | Deploy on Netlify, add `data-netlify="true"` to the `<form>`, and swap the fetch for a plain submit. |
| **Your own API / Supabase / Sheets** | Any endpoint that accepts a JSON POST and returns 2xx. |

The form also carries a honeypot field (`_gotcha`); submissions that fill it are dropped client-side.

## Deploy

- **GitHub Pages** — Settings → Pages → deploy from `main` / root. `CNAME` already points at `lautus.ai`;
  add the DNS records GitHub shows you.
- **Vercel / Netlify / Cloudflare Pages** — import the repo, framework "Other", no build command, output `/`.

## Customize

- Copy lives in `index.html` (headline, lede, footer).
- Colors are CSS variables at the top of `styles.css` (`--navy`, `--blue`, `--cherry*`).
- Fonts: Syne (display), Hanken Grotesk (body), Azeret Mono (labels), loaded from Google Fonts.
- Motion respects `prefers-reduced-motion`.
