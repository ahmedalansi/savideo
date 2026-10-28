# savideo

A clean video downloader: paste a link, pick a quality (up to 4K), optionally trim, download. Built clean-room: no code, text, logo or design copied from any existing site.

| Folder | What it is |
| --- | --- |
| `app/web` | Website, Next.js 15 + Tailwind v4. Deploy this on Vercel. |
| `app/api` | Backend, FastAPI + yt-dlp + FFmpeg + Redis (+ Postgres), Docker Compose with Caddy. Runs on a VPS, not on Vercel. |
| `app/e2e` | Playwright browser tests. |
| `docs` | Architecture, design, brand, launch and deploy notes. |

## Deploy the website on Vercel

1. Import this repository in Vercel.
2. **Framework Preset:** Next.js
3. **Root Directory:** `app/web`
4. Build command, output directory and install command: leave the defaults.
5. Environment variables:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_BASE` | Backend base URL, e.g. `https://api.your-domain.com/v1`. Leave empty to run with the built-in fake data (demo mode, no real downloads). |
| `NEXT_PUBLIC_DEMO_URL` | Optional. A public video you are allowed to share, used by the "Try a demo video" link. |

`NEXT_PUBLIC_*` values are baked in at build time, so redeploy after changing them.

## Backend

The site cannot download anything by itself: real downloads need `app/api` running on a server (yt-dlp and FFmpeg cannot run on Vercel). See `app/api/README.md` and `docs/deploy.md`. On the server, copy `app/api/.env.example` to `.env` and fill it in. Never commit `.env`.

When the site is on Vercel, set these in the backend `.env` so the browser is allowed to call it:

- `WEB_ORIGINS=["https://your-site.vercel.app"]` (and your own domain once you add it)
- `PUBLIC_API_BASE=https://api.your-domain.com/v1`

## Notes

- Use your own domain for the real launch: site on `your-domain.com` (Vercel) and backend on `api.your-domain.com`. The visitor cookie that counts free downloads is `SameSite=Lax`, so browsers will not send it from `*.vercel.app` to a different domain, and the free-download counter would not work there. A `*.vercel.app` address is fine for demo mode.

- Vercel's free Hobby plan is for non-commercial use. A paid plan is needed if the site makes money.
- Legal pages are drafts and need a lawyer's review before public launch.
