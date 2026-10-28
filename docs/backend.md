# Backend: savideo API

Date: 2026-10-25. Code: `app/api/` (FastAPI, Python 3.12). Web wired to it through `NEXT_PUBLIC_API_BASE`.

## What is built

| area | status | notes |
| --- | --- | --- |
| Resolve (`POST /v1/media/resolve`) | done | yt-dlp in-process, generic extractor off, one format per quality up to `max_height`, 10-min cache, thumbnails proxied through a signed `/v1/thumbnail` link |
| Download ticket (`POST /v1/downloads`) | done | validates format and trim, counts quota, returns a 15-min one-off link |
| Stream (`GET /v1/downloads/{token}`) | done | three paths: direct pass-through with Range and Content-Length; FFmpeg merge/trim to fragmented MP4; FFmpeg MP3. Nothing written to disk. Client disconnect kills FFmpeg |
| Throttled sources | done | formats yt-dlp marks with a chunk size are fetched in Range chunks; FFmpeg reads them through a local-only relay (`/internal/relay`, not routed by Caddy) |
| Free limit (F04) | done | 3 per UTC hour per browser (signed httpOnly cookie) + 15 per hashed IP; `GET /v1/quota`; 429 `quota_exceeded` with `resets_at` |
| Rate limits | done | resolve 20/min, playlist 5/min, takedown 3/hour, per hashed IP |
| FFmpeg cap | done | 2 per core across workers (Redis); over the cap `busy` with `retry_at`, which the UI retries |
| Playlists | done | first 20 items, flat |
| Takedowns | done | `POST /v1/takedowns` from the `/copyright` form; email to us via Resend (optional); accepting one blocks every link that maps to a video id and lists the rest |
| Blocklist | done | by platform + video id or channel id; checked on resolve and again on download |
| Admin | done | takedowns, blocklist, platform switches (on/off, max height, proxy), 7-day stats; bearer token |
| Ops | done | `/health`, `/health/canary`, canary every 15 min with automatic pause after 3 failures, nightly yt-dlp update script that switches only if the canary passes |
| Proxy | done, untested live | server IP first; on a bot block, retry through a new sticky residential session, reused for the stream (stream URLs are tied to the IP) |
| Deploy files | done | Dockerfile, docker-compose (api, redis, postgres, caddy), Caddyfile, `.env.example` |

Out of scope for this MVP, as the architecture says: user accounts, payments, the generic auth/Stripe parts of the skill.

## Tests

- `pytest -q` in `app/api`: **42 passed**. Real Redis and Postgres, test videos made by FFmpeg on a Range-capable local server, the API on a real port. Covers resolve errors, format lists, direct download byte-for-byte with Range, 1080p merge (video + AAC), trim length, MP3, quota 3/hour and the IP ceiling, CORS, busy, disconnect cleanup, takedown → block, channel block, platform switch, kill switch, stats, plus unit tests for format picking and yt-dlp error mapping.
- Browser end to end (Playwright, Chromium) with the web app on the real API: resolve, 720p download, trimmed 1080p (4.0 s clip), MP3, limit gate after 3 with countdown, private-video error, takedown form saved in Postgres. Arabic and emoji file names arrive intact.
- **Not tested: real platforms.** This build machine cannot reach YouTube or the other six sites, so yt-dlp itself only ran against test data. First job on the VPS: run the canary with real public test links (`CANARY_URLS`) and try each platform by hand, then the real iPhone test.

## Deviations from architecture.md

- Usage events are written per download straight to `download_events` instead of an hourly roll-up from Redis (simpler, same table).
- Background jobs use a small asyncio loop with Redis locks instead of APScheduler (one fewer dependency).
- Download tokens are random 32-character ids stored in Redis rather than signed tokens; same effect, revocable.
- Debian's FFmpeg in the container instead of a static FFmpeg 7 build.
- yt-dlp installs with its Deno extra, because YouTube extraction now needs a JavaScript runtime.

## Security checklist

- [x] secrets only in env vars, `.env*` git-ignored, nothing secret in the web bundle (only `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_DEMO_URL`)
- [x] input validated on the server on every route (pydantic; URLs parsed, hosts matched to the seven platforms, no ports or credentials in links)
- [x] authorisation on every admin read and write (bearer token, constant-time compare, tested with no/wrong token); no accounts, so no per-user rows
- [x] rate limits on resolve, playlists and takedowns (the only route that sends email)
- [x] no webhooks in
- [x] no uploads
- [x] no user data in URLs or logs: IPs are HMAC-hashed with a daily random salt, Postgres stores no IPs, cookie ids or titles; takedown emails carry no claimant details
- [x] SSRF: generic extractor off, only platform hosts reach yt-dlp, thumbnail proxy only fetches links we signed, relay is localhost-only and not routed by Caddy
- [x] dependencies audited: `pip-audit` clean. `npm audit`: 1 high in the PostCSS copy bundled inside Next 15 (build-time CSS processing of our own files only); the fix is Next 16, a major upgrade, left for later
- [ ] privacy policy lists every processor: add the VPS host, Resend, Cloudflare (if Turnstile is used), the residential proxy provider and Sentry once chosen
- [ ] Turnstile on the takedown form: server check is ready (`TURNSTILE_SECRET`), the widget is not on the page yet

## Keys the owner creates (never by Claude)

| service | variable | needed for |
| --- | --- | --- |
| VPS (e.g. Hetzner) + DNS for `api.` | `API_DOMAIN` | everything |
| random secrets | `SECRET_KEY`, `ADMIN_TOKEN`, `POSTGRES_PASSWORD` | cookies, admin, database |
| residential proxy with sticky sessions | `PROXY_URL` | YouTube from a datacenter IP |
| Resend (own domain) | `RESEND_API_KEY`, `NOTIFY_FROM`, `NOTIFY_EMAIL` | takedown and canary emails |
| Cloudflare Turnstile (optional) | `TURNSTILE_SECRET` | captcha on takedowns |

## Risks to watch after launch

- Proxy cost per GB for 4K; `/v1/admin/stats` shows proxy bytes daily. Lower `max_height` for YouTube with one PATCH if it runs high.
- YouTube may still throttle FFmpeg merges if a format has no chunk hint; check speeds on the VPS.
- Browsers show no progress bar for merged/trimmed files (no length known in advance); the UI shows the estimate.

Update 2026-10-25 (/replica-test): 5 bugs found and fixed (see `bugs.md`); API suite now 48 tests, plus 69 browser tests in `app/e2e/`.

Next: `/replica-diff`.
