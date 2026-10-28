# Test plan: savideo

Build: project files `app/` as of 2026-10-25 (no git repo yet)  Date: 2026-10-25
Env: local. Web (`next build && next start`, real data layer) against the real API, Redis 7, Postgres 16 and FFmpeg, started by `app/e2e/serve_api.py`. yt-dlp is replaced by the fixture extractor, so **no case touched YouTube or any other platform**. Chromium 1440×900 ("desktop") and Pixel 7 ("mobile", cases tagged @mobile).

Every browser case also fails on: any console error (except expected 4xx answers), any uncaught page error, any 5xx response. Axe scans run on S01, S03, S04, S06, S07, S08 and every static page.

Result: **69/69 browser cases pass, 48/48 API tests pass** (after the fixes in `bugs.md`; run twice in a row, no flakes). Before the fixes: 5 bugs, 18 failing cases.

| case | flow | type | steps | expected | auto | result |
| --- | --- | --- | --- | --- | --- | --- |
| F01-H1 | download video | happy | paste link, Get video, Download 720p | file `<title> (720p).mp4` with video+audio, toast, meter "2 of 3" | e2e, desktop+mobile | pass |
| F01-H2 | | happy | Download 1080p | merged MP4, 1080 lines, audio track | e2e | pass |
| F01-N1 | | negative: not a link | "hello world" | inline "doesn't look like a link" | e2e | pass |
| F01-N2 | | negative: unsupported site | vimeo link | "We don't support this site yet" + list | e2e | pass |
| F01-N3 | | negative: private | private video | "This video is private" | e2e | pass |
| F01-N4 | | negative: live | live stream | "Live streams can't be downloaded" | e2e | pass |
| F01-N5 | | negative: too long | 5 h video | "longer than we can handle" | e2e | pass |
| F01-E1 | | edge: empty input | press Get video | error, no request sent | e2e | pass |
| F01-E2 | | edge: very long input | 3 000-character link | invalid link message | e2e + pytest | **fail → BUG-004, fixed** |
| F01-E3 | | edge: no https, tracking params | `youtu.be/…?si=` | resolves | e2e | pass |
| F01-E4 | | edge: double click | double-click Download | one ticket, one free download used | e2e | pass |
| F01-E5 | | edge: refresh mid-flow | reload after resolve | clean page | e2e | pass |
| F01-E6 | | edge: back button | back / forward around the result | normal history | e2e | pass |
| F01-E7 | | edge: offline | resolve while offline, then retry online | network error, Try again works | e2e | pass |
| F01-E8 | | edge: slow network | resolve delayed 1.5 s | loading skeleton + status | e2e | pass |
| F01-E9 | | edge: keyboard only | type, Enter, Tab to 720p, Enter | file saved | e2e | pass |
| F01-E10 | | edge: file gone upstream | download a video whose file 404s | stay on the site, readable error | e2e + pytest | **fail → BUG-001, fixed** |
| F01-E11 | | edge: failed download | same | free download given back | e2e + pytest | **fail → BUG-003, fixed** |
| F01-E12 | | edge: expired session | ticket answers link_expired | "This link has expired" | e2e | pass |
| F01-S1 | | security: replay | fetch one download link many times | spent after 2 (FFmpeg) / 20 (direct, resumes) | pytest | **fail → BUG-002, fixed** |
| F01-S2 | | security: SSRF hosts | `user:pw@`, `:8443`, `youtube.com.evil.com`, `evil.com/?u=youtube.com`, `notyoutube.com`, backslash trick, metadata IP | invalid_url / unsupported_site | manual curl + pytest | pass |
| F01-S3 | | security: relay | `/internal/relay` from outside, spoofed X-Forwarded-For | 404 | manual curl + pytest | pass |
| F01-S4 | | negative: bad body | non-JSON, number for url, huge trim floats | 400 invalid_request | manual curl | pass |
| F02-H1 | audio | happy | Audio tab, MP3 192 | `(192kbps).mp3`, codec mp3 | e2e | pass |
| F02-E1 | | edge: platform without audio | x.com link | Audio tab disabled with reason, can't be selected | e2e | pass |
| F02-E2 | | edge: keyboard | arrows on the tabs | Audio selected | e2e | pass |
| F03-H1 | trim | happy | 0:02–0:06, Download 720p | sizes update, `(720p clip).mp4` of ~4 s | e2e, desktop+mobile | pass |
| F03-N1…N5 | | negative | end before start, beyond end, zero length, `1:75`, letters | exact message, download disabled, fields marked invalid | e2e | pass |
| F03-E1 | | edge: formats | `0:00:03`, `8` | accepted, normalised on blur | e2e | pass |
| F03-E2 | | edge: keyboard | arrows, Shift+arrows | ±1 s / 10 s, clamped | e2e | pass |
| F03-E3 | | edge | Full video, then close the panel | full file downloaded | e2e | pass |
| F03-E4 | | edge | trimmed MP3 | ~3 s MP3 | e2e | pass |
| F04-H1 | free limit | happy | 3 downloads | gate with countdown replaces buttons, axe clean | e2e, desktop+mobile | pass |
| F04-E1 | | edge: refresh | reload, other platform link | gate still shown | e2e | pass |
| F04-E2 | | edge: two tabs | second tab after limit | gate | e2e | pass |
| F04-E3 | | edge: stale tab | tab opened before the limit clicks Download | gate, not an error | e2e | pass |
| F04-E4 | | security: bypass the page | 4th ticket by direct API call | 429 quota_exceeded | e2e + pytest | pass |
| F04-E5 | | edge: new browser | no cookie | 0 of 3 used | e2e | pass |
| F04-E6 | | edge: time | fast-forward the clock 1 h | buttons come back | e2e | pass |
| F04-E7 | | edge: IP ceiling | 16th ticket from one IP with new cookies | 429 | pytest | pass |
| F05 | demo | | real API without `NEXT_PUBLIC_DEMO_URL` | demo link hidden | e2e (implicit, S01 axe) | pass |
| F06-H1 | playlist | happy | playlist link, Choose item 3 | 20 items, chosen video opens | e2e | pass |
| F06-E1 | | edge | watch link with `&list=` | single video | e2e | pass |
| F07 | address-bar shortcut | | | not built (needs our domain) | — | not tested |
| F08-H1 | settings | happy | Dark + Arabic, Esc, reload | RTL + dark persist, axe clean | e2e, desktop+mobile | pass |
| F08-E1/E2 | | edge | default MP3 / 720p | Audio tab preselected / 720p marked Best | e2e | pass |
| S09-H1 | recent | happy | download, open settings, clear, history off | listed, cleared, not recorded | e2e | pass |
| S09-E1 | | edge: corrupt storage | broken JSON in localStorage | page loads | e2e | pass |
| P-* | static pages | | 8 pages, desktop+mobile | one h1, axe clean, no sideways scroll | e2e | **fail → BUG-005, fixed** |
| P-skip | | a11y | Tab, Enter on skip link on / and /faq | jumps to `#main` | e2e | pass (after BUG-005) |
| P-404 | | | unknown path | 404 page | e2e | pass |
| S14-H1 | takedown | happy + negative | submit empty, then valid | field errors, then 201 and confirmation | e2e | pass |
| — | second user's data | | | not applicable: no accounts; quota keyed by signed cookie (a forged cookie is ignored and replaced, checked by hand with curl) | — | — |

## Manual checklist (cannot run from this sandbox)

| # | what | why manual | who |
| --- | --- | --- | --- |
| M1 | Each of the 7 platforms with a real public link: resolve, 720p, best quality, MP3, trim | sandbox cannot reach the platforms | owner, on the VPS |
| M2 | iPhone Safari: download lands in Files › Downloads; a failed download comes back to the site with the message (BUG-001 fix) | real device | owner |
| M3 | Android Chrome: same as M2 | real device | owner |
| M4 | Canary email and takedown email arrive (Resend) | needs keys | owner |
| M5 | Proxy: YouTube 1080p through the residential proxy, speed and cost per GB | needs proxy account | owner |
| M6 | Production cookie: site and API on the same parent domain, visitor quota survives a reload | needs real domains | owner |
