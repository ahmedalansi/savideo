# Architecture: savideo (a rebuild of savevideo.net's core features)

Date: 2026-10-25. Source: `replica/recon.md`, `replica/features.csv`.

One sentence: a Next.js site on Vercel talks to one FastAPI service on a VPS, which uses yt-dlp to read video info and FFmpeg to merge, trim and convert, and **streams the file straight to the browser without ever storing it**. Redis holds the counters and caches; a small Postgres holds takedown notices, the blocklist and anonymous usage stats.

## Defaults chosen for the recon's open questions

These are config values, not code, so each can change later without a rebuild.

| question | default in this plan | config |
| --- | --- | --- |
| Free limit (owner decided 2026-10-25) | 3 YouTube downloads per hour per browser (fixed UTC clock hour); other platforms unlimited, like the original | `QUOTA_LIMIT=3`, `QUOTA_WINDOW=hour`, `QUOTA_PLATFORMS=youtube` |
| YouTube quality | up to 4K, as the brief asks | `platforms.max_height` |
| Platforms | the brief's seven | `platforms.enabled` |
| Long videos | no quality cap; hard cap of 3 h video / 4 h audio, 4 GB per file | `MAX_DURATION_S`, `MAX_BYTES` |
| Languages | English first, Arabic (RTL) second; strings in message files from day one | `next-intl` |
| Revenue | none in MVP; gate CTA points to a "coming soon" extension/app page | — |

## Stack

| layer | choice | why |
| --- | --- | --- |
| web | Next.js 15 (App Router) + TypeScript + Tailwind | the brief's choice; static-first pages are cheap and fast on Vercel |
| i18n | next-intl | EN + AR with RTL without a rewrite later |
| api | Python 3.12 + FastAPI + uvicorn | yt-dlp is a Python library, so we call it in-process instead of shelling out |
| extractor | yt-dlp (pinned, updated by a nightly job) | open source, covers all seven platforms |
| media | FFmpeg 7 (static build) | merge video+audio, trim, MP3; can write fragmented MP4 to a pipe |
| hot state | Redis 7 | atomic counters for quota and rate limits, 10-min cache of video info, download tokens |
| database | Postgres 16 (container on the VPS, or Neon free tier) | three small tables: takedowns, blocklist, usage stats |
| auth | none for visitors (signed anonymous cookie); one `ADMIN_TOKEN` for admin routes | no accounts in the MVP |
| payments | none | not in MVP |
| email | Resend | only to notify us of a new takedown notice |
| jobs | APScheduler inside the API process | nightly yt-dlp update + canary, hourly stats roll-up; no queue needed because downloads stream live |
| proxy | residential proxy with sticky sessions, used per platform (`platforms.use_proxy`) | YouTube blocks datacenter IPs; others mostly don't, and proxy GBs cost money |
| hosting | Vercel (web) + one VPS with Docker Compose: `api`, `redis`, `postgres`, `caddy` (TLS) | the brief's choice; video bytes must not pass through Vercel (time and bandwidth limits) |
| monitoring | Sentry (web + api) + Uptime Kuma on the canary endpoint | we must know the minute an extractor breaks |

Domains: `savideo.example` → Vercel, `api.savideo.example` → VPS. CORS on the API allows only the web origin.

## How a download works

```
browser                 Next.js (Vercel)          FastAPI (VPS)                    platform
  | paste link  ------->  page (client fetch) --->  POST /v1/media/resolve
  |                                                 normalize url, check blocklist
  |                                                 Redis cache hit? else yt-dlp ----> (via proxy if needed)
  | <---------------- title, thumb, formats, sizes -
  | pick 1080p, trim 0:30-1:10
  |  -------------------------------------------->  POST /v1/downloads
  |                                                 quota INCR (atomic) -> 429 if over
  | <---------------- {download_url (signed, 15 min), quota}
  | browser navigates to download_url (native download manager, works on iOS)
  |  -------------------------------------------->  GET /v1/downloads/{token}
  |                                                 ffmpeg -ss 30 -to 70 -i video -i audio
  |                                                   -c copy -movflags frag_keyframe+empty_moov pipe:1
  | <================ bytes streamed as they are made (Content-Disposition: attachment)
```

Three delivery paths, chosen by the API from the format:

1. **Progressive, no trim** (one file with video+audio): pass bytes through with `httpx`, forwarding `Content-Length` and `Range` so the browser shows a real progress bar and can resume.
2. **Needs merge or trim**: FFmpeg reads the separate video and audio URLs and writes fragmented MP4 to stdout, which we stream. Stream copy (`-c copy`), so cuts land on the nearest keyframe (a second or two early). No exact size, so we send the estimate in a header and the UI shows "about X MB".
3. **Audio (MP3)**: FFmpeg reads the best audio and encodes MP3 at 192 kbps to stdout. CPU-bound but light.

If the client disconnects, the API kills FFmpeg and logs `aborted`. Nothing is written to disk.

## Schema

Tables: 4 in Postgres (`platforms`, `takedown_requests`, `blocked_media`, `download_events`), full SQL in `replica/schema.sql`. Access rules: data-layer checks in the API (no accounts; public routes may only insert a takedown request; everything else needs the admin token). No IPs, cookie ids or video titles are stored in Postgres.

### Redis keys

| key | type | TTL | what |
| --- | --- | --- | --- |
| `q:{visitor}:{yyyymmddhh}` | int (INCR) | 2 h | YouTube downloads this clock hour for one browser (only platforms in `QUOTA_PLATFORMS` count) |
| `qip:{iphash}:{yyyymmddhh}` | int (INCR) | 2 h | same per IP, with a higher ceiling (`QUOTA_IP_LIMIT=15`) for shared IPs |
| `fair:{iphash}:{yyyymmddhh}` | int (INCR) | 2 h | fair-use cap for unlimited platforms (`FAIR_USE_IP_LIMIT=60`/hour) to stop scripted bulk use |
| `media:{sha256(normalized url)}` | JSON | 10 min | resolved MediaInfo + the proxy session id used |
| `dl:{token_id}` | JSON | 15 min | token payload (media key, format, trim, proxy session); also stops double counting on retry |
| `rl:resolve:{iphash}` | int | 60 s | resolve rate limit (20/min per IP) |
| `sem:ffmpeg` | int | — | number of running FFmpeg processes (cap per CPU count) |
| `kill:{platform}` | flag | — | emergency off switch, read on every resolve |

`visitor` is a random id in a signed, httpOnly, SameSite=Lax cookie. `iphash` is HMAC-SHA256 of the IP with a salt that rotates daily, so raw IPs are never kept.

## API

All routes under `https://api.savideo.example/v1`. Errors use one shape: `{ "error": { "code": "private_video", "message": "...", "retry_at": null } }`.

### F01/F02/F03 download (video, audio, trim)

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| `POST /media/resolve` | detect platform, check blocklist, read info with yt-dlp (cached 10 min) | anyone, 20/min per IP | `{ url }` | `{ media_id, platform, title, duration_s, thumbnail_url, formats: [{ format_id, kind, height, ext, size_estimate, needs_merge }], audio_supported }` | F01 F02 F03 |
| `POST /downloads` | validate format and trim, count quota, mint a signed download link | anyone with the cookie | `{ media_id, format_id, kind: video\|audio, trim_start_s?, trim_end_s? }` | `{ download_url, expires_at, size_estimate, quota: { used, limit, resets_at } }`, or 429 `quota_exceeded` with `resets_at` | F01 F02 F03 F04 |
| `GET /downloads/{token}` | stream the file (pass-through, FFmpeg merge/trim, or MP3) | holder of a valid token | path token, optional `Range` | file bytes, `Content-Disposition: attachment; filename*=UTF-8''...` | F01 F02 F03 |
| `GET /thumbnail?u=` | proxy the thumbnail (platforms block hotlinking, and it hides visitor IPs from them) | anyone, cached by Caddy | signed thumb url | image | F01 |

### F04 quota

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| `GET /quota` | current usage, to draw the counter and the countdown | anyone | cookie | `{ used, limit, resets_at }` | F04 |

### F06 playlist (could-have)

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| `POST /playlists/resolve` | list the first 20 items (flat, no formats) | anyone, 5/min per IP | `{ url }` | `{ title, items: [{ url, title, duration_s, thumbnail_url }] }` | F06 |

### Legal and admin

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| `POST /takedowns` | store a notice, email us | anyone, 3/hour per IP, Turnstile captcha | claimant, urls, statements, signature | `{ id, status }` | legal |
| `GET /admin/takedowns` | list notices | admin token | `status?` | list | legal |
| `PATCH /admin/takedowns/{id}` | accept / reject; accept adds the urls' media to `blocked_media` | admin token | `{ status, admin_notes }` | notice | legal |
| `POST /admin/blocked` · `DELETE /admin/blocked/{id}` | manage the blocklist directly | admin token | `{ platform_id, media_key, scope, reason }` | row | legal |
| `PATCH /admin/platforms/{id}` | switch a platform off, change max height or proxy use | admin token | fields | row | ops |
| `GET /admin/stats` | downloads, bytes, proxy GB, failure rate by platform, last 7 days | admin token | — | numbers | ops |
| `GET /health` · `GET /health/canary` | liveness; canary resolves one known public test video per platform | anyone / uptime monitor | — | per-platform ok/fail | ops |

### Web routes (Next.js)

`/` (S01–S06, the tool), `/[locale]` for `ar`, `/faq`, `/terms`, `/privacy`, `/copyright` (takedown form), `/apps` (extension/app "coming soon", S11–S12 merged), `/about`, `/contact`. Settings (S08) and recent downloads (S09) are client-only, stored in `localStorage`.

Webhooks in: none. Webhooks out: none (email to us on new takedown).
Jobs (APScheduler in the API):
- `ytdlp_update`, daily 03:00 UTC: install latest yt-dlp into a fresh venv, run the canary set, switch only if it passes; otherwise alert.
- `canary`, every 15 min: resolve one test video per enabled platform; on 3 failures in a row set `kill:{platform}` and alert.
- `stats_rollup`, hourly: flush Redis counters into `download_events` totals; delete events older than 90 days.

## The parts that bite

- **Proxy cost (the biggest risk).** Residential proxies charge per GB, roughly $3–8. A 4K video can be 1–3 GB, so one free download could cost dollars. Mitigation: only YouTube uses the proxy by default; try the VPS IP first and fall back to the proxy only on a block; log `via_proxy` and bytes so `/admin/stats` shows the spend daily; `MAX_BYTES` cap; consider capping 4K behind the limit or later behind a paid tier.
- **Signed media URLs are tied to an IP.** YouTube's stream URLs only work from the IP that resolved them. Resolve and stream must use the **same sticky proxy session**, which is why the session id is stored in the media cache and in the token. Cached info expires after 10 min, before the URLs do.
- **Platform changes.** Extractors break without warning. Nightly yt-dlp update with a canary gate, kill switch per platform, and a friendly "this site is temporarily unavailable" error instead of a crash.
- **CPU and concurrency.** Merge with stream copy is cheap; MP3 encode and many parallel streams are not. `sem:ffmpeg` caps parallel FFmpeg runs (about 2 per core); over the cap the API returns 503 `busy` with a retry hint, and the UI retries.
- **Unlimited non-YouTube downloads.** With no count on other platforms, bandwidth is the open cost. The fair-use IP cap and `MAX_BYTES` bound it; watch `/admin/stats` after launch.
- **Bandwidth.** Every byte goes in and out of the VPS. Pick a host with generous or unmetered egress (e.g. Hetzner) rather than per-GB cloud pricing.
- **Trim accuracy.** Stream copy cuts on keyframes, so a clip can start up to ~2 s early. Good enough for the MVP; say so in the UI. Exact cuts need re-encoding (slow), maybe a later "precise" option.
- **No total size for merged files.** Browsers show an indeterminate progress bar. The UI shows the estimate from the resolve step.
- **Time zones.** The quota window is the UTC clock hour; the API returns `resets_at` as an ISO time and the browser counts down in local time, so DST never matters.
- **Idempotency and races.** Quota uses Redis `INCR` (atomic). The quota is counted once per token: retrying or resuming the same link does not count again. Two tabs racing past 3 are both checked by the same atomic counter.
- **Quota bypass.** Cookie-based counting is easy to clear. The per-IP ceiling (15/hour) limits abuse without punishing shared IPs. Accept some leakage; the limit is a nudge, not a wall.
- **Abuse and SSRF.** Only URLs whose host matches an enabled platform are passed to yt-dlp (no generic extractor), so the server can't be pointed at internal addresses.
- **File names.** Titles are Arabic, emoji, slashes. Sanitize and send `filename*=UTF-8''` (RFC 5987) plus an ASCII fallback.
- **iOS Safari.** Downloads go to the Files app; streamed fragmented MP4 plays fine. Test on a real iPhone early.
- **Privacy (GDPR).** Hashed IPs with a daily-rotating salt, no accounts, nothing stored about what a visitor downloaded on our side. Recent downloads live only in the visitor's browser.
- **Legal.** Blocklist checked on every resolve; clear user-responsibility notice next to the button; takedown form with a 48 h response target.

## Build order

1. **Vertical slice** (prove the stack, ugly is fine): S01 → S02 → S03 → S05 for one YouTube video at 360p/720p progressive and one Reddit video. Routes: `POST /media/resolve`, `POST /downloads`, `GET /downloads/{token}`, `GET /health`. Redis only. Docker Compose on the VPS with Caddy, proxy wired for YouTube. **Exit test:** a 720p YouTube video downloads on desktop Chrome and iPhone Safari from the deployed site.
2. **Must-haves:**
   - download: FFmpeg merge for 1080p–4K, MP3 path, file-name handling (S03, S05)
   - trim: S04 time inputs, validation, trimmed size estimate, FFmpeg `-ss/-to`
   - quota: cookie + IP counters, `GET /quota`, S06 gate with countdown (F04)
   - errors: invalid, unsupported, private, removed, age-restricted, live, geo-blocked, too long, too big, busy
   - legal: Postgres up with `schema.sql`, `/terms`, `/privacy`, `/copyright` + `POST /takedowns`, blocklist check, admin routes
3. **Should-haves:** all seven platforms with the canary, Shorts links, light/dark theme, default quality, mobile polish, FAQ + how-to (our own words), `/apps` CTA page, Arabic RTL, `/admin/stats`, nightly yt-dlp job.
4. **Could-haves:** demo video button, playlists (first 20), recent downloads in `localStorage`, clean-UI toggle, TikTok/Instagram, per-platform landing pages.
5. **Fixes from replica-entrepreneur**, once it has run.

## Summary

- Stack: Next.js + Tailwind on Vercel → FastAPI + yt-dlp + FFmpeg on one VPS (Docker Compose), Redis for quota/cache, small Postgres for legal and stats, residential proxy for YouTube only.
- Tables: 4 Postgres tables + 7 Redis key types. Routes: 16 API routes, 9 web pages.
- Riskiest parts: proxy cost per GB for large/4K files; extractors breaking (YouTube especially); legal exposure from YouTube's terms.
- Next step: `/replica-design`.
