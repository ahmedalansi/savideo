# Brand: Naqi (نقي)

Written 2026-10-26 by /replica-brand (followed `tools/replica-skill/replica-brand/SKILL.md`; it is not installed as a slash command).
Angle from `replica/fixes.md`: **A. Clean**, one click, one file, no ads, nothing to install.

**Recommended name: Naqi (نقي, Arabic for "pure, clean").** It says the angle in one word, reads the same in Arabic and English, is four letters, and has no P or V (sounds Arabic speakers often swap). The working name "savideo" is gone: it was one letter away from the original "SaveVideo" and would fail the confusing-similarity test on its own.

## 1. Twenty candidates

| style | candidates |
| --- | --- |
| descriptive | Clearcut, OneFile, Getclean, Tahmeel (تحميل, "download") |
| compound | Fetchwise, Grabwell, Tidyclip, Clipwell, OneGrab |
| invented | Lumo, Kalio, Nuvio, Keeply |
| metaphor | Naqi (نقي, "pure"), Dorrah (درّة, "pearl"), Harbor, Lantern |
| verb / Arabic | Wasla (وصلة, "link"), Sahl (سهل, "easy"), Nadeef (نظيف, "clean") |

Cut, with reasons: anything with "save" or "video" (too near SaveVideo); Nuvio, Kalio (the "-io/-vio" sound echoes "video"); Clearcut (ClearCut: Media Converter is already on the App Store, same category); OneGrab ("OneGrab: Video Saver" exists, same category); Keeply (existing hidden-photos app); Grabwell (drowned out by Grab); Sahl (Kuwait's government services app); Lumo, Harbor, Lantern (crowded words); Nadeef, Tahmeel (hard to spell in English).

## 2. The five, and the checks

Legend: a result has the date it was run. **to run** means nobody has checked it yet. Nothing below says "available", because no availability check could be run from this workspace: domain lookup (RDAP), the App Store API and GitHub user lookups are blocked here, and the trademark databases need a browser.

| check | Naqi | Fetchwise | Dorrah | Wasla | Tidyclip |
| --- | --- | --- | --- | --- | --- |
| web search "name + app / video downloader" | 2026-10-26: no video tool found. A Kuwait water brand "Naqi" has an iOS app (drinks, class 32, not ours) and a Play developer named NAQI | 2026-10-26: nothing found; only FreightWise and Fetch Rewards | 2026-10-26: nothing in category; Dorr Drivers, Dora apps | 2026-10-26: "Wasla" tradesmen app and Wasl Communities, both Gulf | 2026-10-26: nothing exact; TidyPic, Tidy cleaner apps close by |
| US trademark (tmsearch.uspto.gov, classes 9 and 42) | to run | to run | to run | to run | to run |
| EU trademark (TMview) | to run | to run | to run | to run | to run |
| Canada (ised-isde.canada.ca) | to run | to run | to run | to run | to run |
| WIPO Global Brand Database (also covers Gulf offices) | to run | to run | to run | to run | to run |
| domain (.com, .app, .io) | to run | to run | to run | to run | to run |
| App Store and Play, exact name | partly, see web row | to run | to run | to run | to run |
| handles: X, Instagram, TikTok, GitHub | to run | to run | to run | to run | to run |

Ranking: **Naqi** (best fit to the angle, bilingual, the only known holder is in another class) > Fetchwise (clearest search, but English-only and says nothing about "clean") > Dorrah > Tidyclip (sits among photo-cleaner apps) > Wasla (taken by two Gulf apps).

Fallback if Naqi fails a check: Fetchwise.

These are screening checks, not legal clearance. Before buying the domain or printing anything, have a trademark lawyer search classes 9 and 42 in the US, EU and the Gulf (WIPO covers the GCC offices), since the Kuwaiti "Naqi" brand is the one to rule out.

## 3. Palette

Original: SaveVideo's only declared colour is a violet-black theme colour (`#0a0714`, from its `theme-color` meta, checked 2026-10-26). Ours is **teal**, a different hue family, and our dark background is now teal-tinted instead of neutral so it does not sit next to their violet-black.

| role | light | dark |
| --- | --- | --- |
| accent | `#0e7481` | `#4cc9d3` |
| accent-hover | `#0a5a64` | `#7ad9e0` |
| accent-subtle | `#e2f3f4` | `#10303a` |
| on-accent | `#ffffff` | `#04181b` |
| bg | `#ffffff` | `#0c1315` |
| surface | `#f4f7f7` | `#131c1f` |

Danger, success and warning are unchanged. Contrast: `contrast.py` on both files, **0 AA failures** (light 20 pairs, dark 22 pairs; accent on bg 5.48:1 light, 9.47:1 dark). Tokens are in `app/web/design/` and mirrored in `replica/design/`; CSS regenerated with `build_css.py`.

## 4. Logo brief

- **Idea:** a single drop (pure, clean: the meaning of نقي) with a download arrow cut through it. One drop, one file.
- **Mark type:** symbol plus wordmark. Symbol alone for the favicon and app icon. Latin "Naqi" and Arabic "نقي" lockups, same weight.
- **Starter:** a first version of the drop is already in `app/web/components/Wordmark.tsx` and `app/web/app/icon.svg` (favicon) so the site isn't unbranded. Treat it as a sketch for the designer, not the final mark.
- **Must work** at 16px (the arrow may drop out below 20px; test a solid-drop variant) and as a 1024px app icon.
- **Deliverables:** SVG (symbol, both lockups, mono black and white), iOS app icon 1024x1024 with no transparency, favicon set (16, 32, 180 apple-touch, 512), social image 1200x630.
- **Must not resemble the original's mark:** their header shows a text logo "SaveVideo4K" on violet-black. No wordmark with a "4K" suffix, no violet, no dark-violet tile behind the mark. Put the drafts next to their header and check.

## 5. Voice

Three words:
- **Plain**, not dull. Short sentences, everyday words, one idea per line.
- **Calm**, not cold. Never shouts, never rushes, never invents urgency.
- **Honest**, not apologetic. Says what happened and whose fault it is, then what to do.

| do | don't |
| --- | --- |
| "Your download has started." | "Success!!! Your video is ready!!" |
| "They come back at the top of the hour." | "Hurry! Limited free downloads left!" |
| "Optional: the browser extension" | "Install our extension to continue" |
| "That's on us, not you. Please try again." | "Oops! Something went wrong." |
| "Only on this device." | "Your data is 100% safe and secure." |

## 6. Rewritten strings (EN and AR)

| key | before | after |
| --- | --- | --- |
| hero.title | Save any public video from a link | Paste a link. Get the file. That's it. / الصق الرابط، خذ الملف، وانتهى. |
| hero.lead | Paste the link, choose a quality up to 4K, cut out just the part you need. Nothing to install. | No ads, no pop-ups, nothing to install. Pick a quality up to 4K and cut out just the part you need. |
| loading.status | Reading the video… | Reading the link… |
| quota.gateTitle | You've used this hour's free downloads | That's this hour's 3 free downloads |
| quota.gateBody | (pointed at the extension to lift the limit) | They come back at the top of the hour. Leave this tab open and the counter below will tell you when. You don't need to install anything. |
| quota.cta | Get the extension (coming soon) | Optional: the browser extension (coming soon), now a small ghost link, not the main button (fix 2) |
| quota.back | Your free downloads are back. | You're good to go. Your free downloads are back. |
| result.startedToast | Your download has started. Check your browser's downloads. | Your download has started. The file is in your browser's downloads. |
| result.failedToast | The download didn't start. Please try again. | The download didn't start. That's on us, not you. Please try again. |
| result.newLink | Try another link | Paste another link |
| settings.recentEmpty | Nothing yet… | Nothing here yet. Your recent downloads show up here, and only on this device. |
| footer.rights | Brand placeholder, final name and logo come later. | Naqi: one link, one file, no ads. |

Page titles, the header label, About and Terms now say Naqi. The e2e test for the limit gate was updated to the new heading.

## 7. Sweep

`replica/brand.json` lists `SaveVideo`, `SaveVideo4K`, the old working name `savideo`, the domain `savevideo.net` and the colour `#0a0714`.

`python3 tools/replica-skill/replica-brand/sweep.py app --config replica/brand.json` → **Clean** (2026-10-26). Internal names were renamed too: Docker image and user, Postgres database and user, logger names, package names, `*.naqi.example` placeholder domains.

`next build` passes. Screenshots: `replica/brand/home-light.png`, `home-dark.png`, `home-ar.png`. The full e2e suite was not rerun (it needs Postgres, Redis and FFmpeg, not set up in this session).

Checked by eye: favicon, header mark, page titles. Not yet existing, so not checked: email templates, OG image, app icon.

Left as is on purpose: the internal CSS prefix `sv-` and the `sv.prefs` storage key. They never show to users, and renaming the storage key would reset saved settings.

Next: `/replica-launch`.
