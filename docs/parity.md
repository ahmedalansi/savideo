# Parity: savideo vs savevideo.net

Date: 2026-10-25. Build: project files `app/` after /replica-test (69/69 browser cases, 48/48 API tests). Tools: `tools/replica-skill/replica-diff/parity.py` on `replica/features.csv`.

## Verdict: not shippable yet (one step away)

| | score |
| --- | --- |
| Overall | **87.5 / 100** (features only, layout not measured, see below) |
| Features | **87.5** (26 counted, must-haves **10 of 11**) |
| Layout | not measured |
| Open S1 / S2 bugs | none / none |

The only thing between "not shippable" and "shippable" is one must-have marked partial: the copyright and takedown page works (form posts to `POST /v1/takedowns`, accepted takedowns block the video, disclaimer under the input), but the legal text has not been reviewed by a lawyer and exists in English only. That is a pre-launch task, not a build gap. Once it is done the feature score becomes 90.2 and every must-have is in, which is "shippable" by the skill's rules.

Caveat that the score cannot see: every download test ran against fixtures. Nothing has been fetched from YouTube, Facebook, X, Reddit, Twitch, Bilibili or Dailymotion yet, because the sandbox cannot reach them. Parity on paper is high; parity in the wild is unproven until the API runs once from the VPS behind the proxy.

## Feature score by area, weakest first

| area | score | features |
| --- | --- | --- |
| legal | 50.0 | 1 |
| platform (mobile/iOS) | 50.0 | 1 |
| platforms | 66.7 | 4 |
| content | 66.7 | 2 |
| settings | 78.6 | 5 |
| input, result, download, trim, quota, errors | 100 | 13 |

## Missing, in build order

1. [must] Copyright disclaimer and takedown page: partial. Lawyer review of Terms, Privacy and Copyright; Arabic versions.
2. [should] Mobile incl. iOS Safari: partial. Checked at 390 px in Chromium; never on a real iPhone (downloads go to Files there).
3. [should] The seven platforms: partial. yt-dlp wired for all seven with kill switch and canary; needs a live check from the VPS.
4. [could] Per-platform landing pages: no (SEO).
5. [could] TikTok, Instagram, Pinterest: no (not in the brief; owner's call).
6. [could] Clean UI toggle: no.
7. [could] Multi-language: partial. EN + AR with RTL for the tool; Arabic is client-side only (not in server HTML, so not indexed) and legal pages are English only. Original has 24 languages.

Left out on purpose (not scored): long-video 360p cap (we chose 3 h / 4 GB hard limits instead), browser extension, Android app, paid desktop app, address-bar domain shortcut, sister audio site.

## Layout diff: not measured

`replica/screens/` is empty. Recon read the original's public pages as text only and saved no screenshots, and this sandbox cannot reach savevideo.net (the network proxy refuses the host), so there is nothing to put next to `replica/clone-screens/`. Layout is left out of the overall score instead of guessed.

This costs little: the skill weights layout at 20% and says not to chase the original's look, and our screens follow the same structure recon recorded (input with Paste on top, result card with thumbnail and Video/Audio tabs, quality rows with sizes and per-row download, trim inside the result, gate replacing the buttons). To measure it later: from a machine that can open the original, take 1440×900 and 390×844 shots of S01, S03, S06, S07 in the same state as ours, save them to `replica/screens/`, then

```bash
python3 tools/replica-skill/replica-diff/imgdiff.py replica/screens/S03.png replica/clone-screens/S03.png --json > replica/diffs/S03.json
python3 tools/replica-skill/replica-diff/parity.py replica/features.csv --visual replica/diffs/*.json --markdown
```

For our own regressions from now on, `replica/clone-screens/` is the baseline for `imgdiff.py --mode pixel`.

## Behaviour diff

| flow | original does | clone does | fix or keep |
| --- | --- | --- | --- |
| F01 download | 3 clicks: Paste, submit, quality row | 2 clicks: Paste fetches straight away, then the quality row | keep (win) |
| F01 errors | status message on the page | named message per case (private, live, removed, too long, unsupported with the list, busy with auto-retry countdown); a failed download returns to the site with a toast | keep |
| F01 replay | not known | a download link works 2 times (merged) or 20 (direct, for resumes), then expires | keep |
| F04 free limit | 3 YouTube downloads per hour; other platforms unlimited | 3 per hour across **all** platforms, per browser cookie, plus 15 per IP | decide: this is stricter than the original. Matching it (YouTube only) is a one-line config change and removes a reason to prefer the original |
| F04 failed download | not known | failed download gives the free download back | keep (win) |
| F04 gate | countdown plus extension and app install buttons | countdown plus "coming soon" apps page | fix later: the gate has nothing to sell until the extension or app exists, so it is a dead end today |
| quality cap | YouTube up to 1080p on the web; 10 min+ limited to 360p | up to 4K on every platform, no length cap below 3 h | keep (win for users); watch proxy bandwidth cost |
| F06 playlist | first 20 items, more with the extension | first 20 items | keep |
| F07 address-bar shortcut | edit the domain on a YouTube page | not built | later: needs our domain; a `?url=` prefill on the home page would be the first step |
| F08 settings | 4 themes, 24 languages, clean UI, history toggle | 3 themes (System/Light/Dark), EN + AR, history toggle | keep themes; clean UI is optional |
| F09 iOS Safari | file to Files, add to Home Screen | untested on a real device | fix: test on an iPhone |
| remembered between visits | settings and recent list on the device | same (localStorage), quota in a cookie | keep |
| emails | none to visitors | none to visitors; takedown notices email us | keep |

## Top five to build next

1. **Legal review**: get Terms, Privacy and Copyright reviewed, then add Arabic versions. Closes the last must-have.
2. **Live platform check**: deploy the API to the VPS with the residential proxy and resolve plus download one real link per platform (seven). This is the biggest unknown left.
3. **Real iPhone test**: F01, F02, F03 on iOS Safari.
4. **Decide the free-limit scope**: YouTube only (like the original) or all platforms (current). Config only, but it changes how the product compares.
5. **Arabic in the server HTML and per-platform landing pages**: both are about search traffic, and both matter more at launch than the clean-UI toggle.

After 1 and 2, parity is there and the next phase is /replica-entrepreneur (three things the original's users complain about), which is what turns "shippable" into "better than the original".
