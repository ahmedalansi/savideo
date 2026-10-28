# Bugs: savideo

Found by /replica-test on 2026-10-25 (test plan: `test-plan.md`). Only reproduced bugs are listed. There is no git repo yet, so "fixed" names the files changed in project files instead of a commit. Every fix has a test that failed before and passes now.

| ID | severity | title | status |
| --- | --- | --- | --- |
| BUG-001 | S2 | A download that fails on the server replaces the site with raw JSON | fixed |
| BUG-002 | S2 | One download link can be fetched any number of times for 15 minutes | fixed |
| BUG-003 | S3 | A failed download still uses up a free download | fixed |
| BUG-004 | S3 | A very long link gives "Reload the page" instead of "not a link" | fixed |
| BUG-005 | S4 | Skip link points at the downloader, which only exists on the home page | fixed |

Open S1: none. Open S2: none.

---

### BUG-001: A download that fails on the server replaces the site with raw JSON

- Severity: S2 (core flow ends on a dead page, no way back but the browser's Back button)
- Flow / case: F01 / F01-E10
- Screen: S05
- Build: project files 2026-10-25  Browser / device: Chromium 1243, 1440px

Steps
1. Paste a link whose video files have gone away by download time (fixture `watch?v=BROKENSTRMx`; in real life: a stream URL that expired or is tied to another IP, the proxy failing, all FFmpeg slots taken in between).
2. Get video, then Download 720p.

Expected: the visitor stays on savideo and reads what went wrong.
Actual: the browser leaves the site and shows `{"error":{"code":"platform_down","message":"Upstream answered 404.","retry_at":null}}`. The download button navigates to the API link (cross-origin, so the `download` attribute is ignored), and any error from that link is JSON.
Evidence: `bugs/BUG-001.png` (before), `bugs/BUG-001-fixed.png` (after); `f01-download.spec.ts` F01-E10; `test_bug001_*` in `app/api/tests/test_api.py`.
Fix: when the browser itself opens the link (`Sec-Fetch-Mode: navigate` or `Accept: text/html`), errors answer `303` to `<WEB_ORIGINS[0]>/?download_error=<code>`; the home page shows that error as a toast and removes the parameter. Scripts still get JSON. The result panel is lost on the way back, so the visitor pastes the link again.
Status: fixed in `app/api/app/main.py`, `app/web/components/downloader/Downloader.tsx`

### BUG-002: One download link can be fetched any number of times for 15 minutes

- Severity: S2 (security: the free limit and the FFmpeg cap can be bypassed)
- Flow / case: F01, F04 / F01-S1
- Screen: none (API)

Steps
1. Get one download link for 1080p (uses 1 free download).
2. `curl` the link 5 times.

Expected: the link is spent after the download (and maybe one retry).
Actual: all 5 return the full 17 MB file and each starts a new FFmpeg run; quota still shows 1 used. One free download can be shared or replayed, and one link fired in parallel can fill every FFmpeg slot, so everyone else gets "busy".
Evidence: curl log in this run (`200 17216521` ×5, quota `used: 1`); `test_bug002_download_link_cannot_be_replayed`.
Fix: a use counter per link in Redis (`dlu:<token>`, same 15-minute life). FFmpeg links allow 2 fetches (one browser restart), direct links 20 (Range resumes). Past that: `410 link_expired`.
Status: fixed in `app/api/app/main.py`

### BUG-003: A failed download still uses up a free download

- Severity: S3 (visibly wrong, workaround: wait for the hour)
- Flow / case: F04 / F01-E11

Steps
1. As BUG-001, then check `GET /v1/quota`.

Expected: `used: 0`, nothing reached the visitor.
Actual: `used: 1`. The quota is counted when the link is issued, and nothing gives it back when the stream fails before the first byte.
Evidence: `f01-download.spec.ts` F01-E11; `test_bug003_failed_download_gives_the_free_download_back`.
Fix: the link remembers the visitor and hashed IP; an error before the first byte refunds both counters once per link (`refund:<token>`).
Status: fixed in `app/api/app/main.py`

### BUG-004: A very long link gives "Reload the page" instead of "not a link"

- Severity: S3
- Flow / case: F01 / F01-E2
- Screen: S01

Steps
1. Paste a YouTube link with 3 000 extra characters, Get video.

Expected: "That doesn't look like a link…"
Actual: "Something in that request wasn't right. Reload the page and try again." The browser sent it (no length check) and the API's body validation (2 048 max) answered `invalid_request` before the link check could answer `invalid_url`.
Evidence: `f01-download.spec.ts` F01-E2; `test_bug004_overlong_link_is_an_invalid_link`.
Fix: the browser check refuses links over 2 048 characters; the API body cap moved to 16 384 so the link check answers `invalid_url`.
Status: fixed in `app/web/lib/platforms.ts`, `app/api/app/main.py`

### BUG-005: Skip link points at the downloader, which only exists on the home page

- Severity: S4 (accessibility)
- Flow / case: all static pages / P-*
- Screen: S10–S15

Steps
1. Open `/faq`, press Tab, Enter.

Expected: focus jumps past the header to the page content.
Actual: nothing happens (`#downloader` does not exist there); axe flags the link as content outside any landmark on 7 pages × 2 widths.
Evidence: `pages.spec.ts` P-/faq … P-/contact (axe `region`), P-skip.
Fix: the link now targets `#main` on every page; text "Skip to main content" / "انتقل إلى المحتوى الرئيسي".
Status: fixed in `app/web/components/Header.tsx`, `app/web/messages/en.json`, `app/web/messages/ar.json`

---

## To check (not reproduced, or needs the real setup)

1. **Cookie across domains.** The free limit counts per browser through a cookie set by the API. It works only while the site and the API share a parent domain (`savideo.example` + `api.savideo.example`). If the site is served from `*.vercel.app` and the API from another domain, browsers that block third-party cookies (Safari, Chrome with the block on) start a new visitor on every request, and only the 15-per-IP ceiling applies. Deploy on one domain.
2. **Real IPs behind Cloudflare.** Uvicorn trusts `X-Forwarded-For` from anyone (`--forwarded-allow-ips '*'`), which is safe only because Caddy overwrites that header. If Cloudflare is put in front of Caddy, Caddy needs `trusted_proxies` for Cloudflare's ranges, or every visitor shares Cloudflare's IPs for the per-IP limits.
3. **Arabic toast after a failed download.** The BUG-001 toast is picked before saved preferences load, so an Arabic visitor may see it in English. Not reproduced in a test.
4. **Size estimates for merged formats.** On the fixture, 1080p showed "about 2.7 MB" and delivered 17 MB, because the estimate comes from the bitrate yt-dlp reports. Check on real YouTube videos.
5. **Very fast double click.** A real double click issued one link. Two clicks fired by script in the same frame issued two (2 free downloads used). Unlikely for people; could be closed by a guard in `ResultPanel.download`.
6. **Failure mid-file.** If the platform stops halfway, the browser shows a failed download with no message from us (we cannot change a response that has started). Not tested what the browser's Retry does then.
