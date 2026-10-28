# Build log: savideo web

Date: 2026-10-25. Data layer: fake (seed data), real one waits for /replica-backend. Screens checked at 1440 and 390 px, keyboard only, light, dark and Arabic RTL; no console errors (Playwright run).

| ID | screen | status | missing | harder than expected |
| --- | --- | --- | --- | --- |
| S01 | Home / downloader | done | real platform glyph review by /replica-brand | Paste fallback when the clipboard is blocked |
| S02 | Processing | done | | busy auto-retry countdown |
| S03 | Result panel | done (fake data) | real sizes and thumbnails from the API | recommended row from the default-quality preference |
| S04 | Trim | done (fake data) | real FFmpeg cut | validation messages plus a live size update without noisy announcements |
| S05 | Download states | partial | real progress: the browser's download manager owns the transfer, so the row shows "Downloading" for a moment then "Saved" | we can't see native download progress from the page |
| S06 | Limit gate | done (fake counter) | server counter via GET /quota | |
| S07 | Playlist | partial (could) | real POST /playlists/resolve, 20 items | |
| S08 | Settings | done | clean-UI toggle (could) | |
| S09 | Recent downloads | done | | |
| S10 | Platform landing pages | not started (could) | | |
| S11/S12 | Apps page | done | store links once they exist | |
| S13 | Tools directory | skipped | covered by the platform grid | |
| S14 | Legal pages | partial | lawyer review, Arabic versions, takedown form posts nowhere yet | |
| S15 | About / Contact | done | real contact address | |

Notes and deviations from the plan:
- i18n uses a small in-house provider over the `messages/*.json` files, switched from Settings, instead of next-intl `/[locale]` routes. Strings are already in message files, so moving to next-intl later is mechanical. Arabic is client-side only for now (not in the server HTML, so not indexable yet).
- Radix was not added: tabs, radio groups, the settings sheet (native `<dialog>`) and the FAQ (`<details>`) are hand-built with keyboard support, to keep dependencies small.
- Free limit follows architecture.md: 3 per hour across all platforms.

- 2026-10-26 /replica-launch: home page extended into the landing page (problem, promises, pricing, 2 FAQ items, final CTA; EN+AR), new e2e test f09-clean (not run). Docs in replica/launch/.
