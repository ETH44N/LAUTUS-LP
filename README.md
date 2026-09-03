# Lautus — coming soon

The holding page for [lautus.ai](https://lautus.ai): deep navy, white, a warm cherry accent, and glass.
Plain HTML/CSS/JS — no build step, no framework, deploys anywhere that serves static files.

```
index.html   markup + copy
styles.css   theme, glass, layout, motion
script.js    signup form, timecode HUD, waveform, pointer tilt
favicon.svg  tab icon
og.png       social share image (1200×630)
CNAME        custom domain for GitHub Pages
```

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

- Copy lives in `index.html` (headline, lede, chips).
- Colors are CSS variables at the top of `styles.css` (`--navy-*`, `--cherry*`, `--glass-*`).
- Fonts: Syne (display), Hanken Grotesk (body), Azeret Mono (labels), loaded from Google Fonts.
- Motion respects `prefers-reduced-motion`.
