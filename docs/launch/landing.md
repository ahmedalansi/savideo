# Landing page: Naqi

Written 2026-10-26 by /replica-launch (followed `tools/replica-skill/replica-launch/SKILL.md`; it is not installed as a slash command).
Angle: **A. Clean** (`replica/fixes.md`). Voice: plain, calm, honest (`replica/brand.md`).

**Built:** the home page `/` is the landing page, with the working downloader as the hero. Code: `app/web/app/page.tsx` and `app/web/components/home/` (new: `Problem.tsx`, `Features.tsx`, `Pricing.tsx`, `FinalCta.tsx`). All copy is in `app/web/messages/en.json` and `ar.json` (keys `problem`, `features`, `pricing`, `cta`, `faq.q7`, `faq.q8`).
Screenshots: `replica/launch/shots/landing-light.png`, `landing-dark.png`, `landing-ar.png`, `landing-mobile.png`.

## Proof rules followed

No testimonials, no user counts, no star ratings, no press logos, no "trusted by". The proof section is left out on purpose until we have real beta users who agree to be quoted. No reviewer quotes from the research appear on the page. No competitor is named.

## Sections

| # | section | copy (EN) | tied to |
| --- | --- | --- | --- |
| 1 | **Hero** | "Paste a link. Get the file. That's it." / "No ads, no pop-ups, nothing to install. Pick a quality up to 4K and cut out just the part you need." The button is the product itself (Get video), not a screenshot of it. | angle A |
| 2 | Works with | the 7 platforms, generic icons (not their logos) | parity |
| 3 | **The problem** | "Most downloader sites fight you." Card 1 "The button is a trap": you press Download and get a new tab, a pop-up or an ad. Card 2 "Install this first": the extension you must add, or the fake virus warning, before HD. Close: "Naqi does one thing: you paste a link, you get the file." | hate themes 1 (ads, 40 reviews) and 2 (installs/malware, 28), paraphrased |
| 4 | How it works | "Three steps, no account": copy the link, paste it here, pick and save. | core flow F01 |
| 5 | **What we promise** | 1 No ads, no pop-ups, no new tabs. 2 Full quality, nothing to install. 3 Errors that tell you why. 4 No scare tactics, ever. 5 No account, nothing kept. 6 Trim before you save. | fixes 1, 2, 3, 4; then privacy and trim |
| 6 | Pricing | Free (available now) and Plus (planned, $3/month or $30/year, "not on sale yet"). See `pricing.md`. | billing theme 4 |
| 7 | FAQ | the 6 existing questions plus two real objections: "How do you make money without ads?" (honest: today we don't) and "Do I have to install the extension or app?" (no). | trust theme, fix 2 |
| 8 | **Final call to action** | "Got a link? Try it now." / "No sign-up and nothing to install. Your first file is a paste away." Button "Paste a link" jumps back to the input. | |

Arabic: every line above has an Arabic version in `ar.json`, e.g. "معظم مواقع التنزيل تعاندك" and "معك رابط؟ جرّبه الآن.". The page is RTL in Arabic (checked in `landing-ar.png`).

## Every promise is true today, or labelled

| promise | status |
| --- | --- |
| no ad networks, no pop-ups | true: no third-party scripts load. New e2e test `app/e2e/tests/f09-clean.spec.ts` fails if a download click opens a window or leaves the page, or if the home page loads a third-party script. **Not run yet** (needs the Postgres/Redis/FFmpeg e2e setup). |
| every quality without installing | true in the web app; the free limit gate offers waiting as the main path (brand fix 2) |
| errors say why | true for the error codes in `errors.*`. The public "YouTube: working" status line (fix 3, second half) is **not built**, so the page does not promise it |
| no account, files not stored | true per `backend.md` (streamed, not stored) |
| Plus features | labelled "Planned" and "Not on sale yet" |

## Checks run (2026-10-26)

- `next build` passes. Home page first-load JS is **132 KB**, over the 100 KB budget in fix 6 (it was already over before this phase; the new sections add about 1 KB). Flag for /replica-deploy.
- Contrast: `contrast.py` on both token files, 0 AA failures. New pairs on this page checked by hand: accent on accent-subtle 4.79:1 light / 7.04:1 dark, muted on accent-subtle 5.40 / 5.60.
- No horizontal scroll at 390 px and 1440 px, no console errors, in light, dark and Arabic.
- `sweep.py app --config replica/brand.json`: clean.
