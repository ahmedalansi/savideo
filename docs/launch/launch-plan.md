# Launch plan: Naqi

Written 2026-10-26 by /replica-launch.

## Before anyone outside sees it (blockers)

| # | item | status |
| --- | --- | --- |
| 1 | Lawyer review of Terms, Privacy, Copyright pages, plus Arabic versions | open (blocker in `parity.md`) |
| 2 | Trademark and domain checks for "Naqi", including the Kuwaiti water brand in class 32 | open (`brand.md`) |
| 3 | Live test from the VPS through the residential proxy, all 7 platforms | open (no platform access from this workspace) |
| 4 | Run the full e2e suite, including the new `f09-clean.spec.ts` | open |
| 5 | Home page JS under 100 KB (now 132 KB) and resolve under 3 s at p50 | open, for /replica-deploy |
| 6 | A real logo from the brief in `brand.md` (current drop is a sketch) and a 1200x630 social image | open |

## Waitlist and beta (weeks 1 to 2)

- Add one email field to the landing page: "Tell me when Naqi opens". Use a privacy-friendly list (for example Buttondown or a self-hosted form) and say in one line what you will send. No pre-ticked boxes.
- Invite 20 to 50 people you know who download videos for work: teachers, video editors, social media managers. These were the use cases that came up in the research.
- Ask each beta user, in their words, whether we may quote them. Only those quotes ever go on the page.

## Live before launch day

- **Analytics:** privacy-friendly and cookie-free (Plausible or self-hosted Umami), so the privacy page stays true. Track only: page views, "Get video" pressed, result shown, download started, error code, limit gate shown. No link URLs, no IPs stored.
- **Error tracking:** Sentry or self-hosted GlitchTip on the web app and API, with link URLs scrubbed.
- **Canary:** the platform canary in `app/api/app/jobs.py` already runs every 15 minutes and emails you through `notify.py` (Resend) when a platform fails 3 times in a row. Set `canary_urls` and the email settings on the VPS.
- **yt-dlp update job:** `scripts/update-ytdlp.sh` on a daily timer, with the canary run after each update.

## Where unhappy users of other downloaders talk

From the research (`fixes.md`): Trustpilot pages of the ad-heavy sites, and AlternativeTo's list of alternatives. Reddit and Hacker News could not be read from this workspace, so check these by hand before posting:

- **AlternativeTo:** add Naqi as an alternative under the big downloader sites. This is where people actively look for a replacement.
- **Reddit:** communities about downloading and archiving video, and Arabic tech communities. Read each one's rules first; many ban self-promotion or downloader links outright.
- **Arabic audience:** Hsoub I/O (io.hsoub.com), Arabic tech accounts on X, and Telegram tech channels. The product is bilingual from day one, which most competitors are not.

Never post fake reviews, never answer complaints on a competitor's page with our link, and never use a competitor's name in ads or keywords.

## Launch posts that lead with the fix

**Show HN** (only after blockers 1 and 3):
"Show HN: Naqi, a video downloader with no ads, no pop-ups and nothing to install". Body: why (every site in this category hides the button behind ads), what it does, that it is built on yt-dlp and FFmpeg (credit them plainly), the free limit and why it exists, what we log. Expect questions on copyright and platform terms; answer them straight.

**Product Hunt:** check its current guidelines on download tools before preparing a post; if allowed, tagline "One link, one file, no ads." Same rule: no fake upvotes, no asking friends to vote.

**Arabic post:** "نقي: الصق الرابط، خذ الملف، وانتهى. بلا إعلانات ولا نوافذ منبثقة ولا تثبيت."

## The first 10 users, by hand

Talk to 10 people (a 15-minute call or chat) in the first two weeks. Pick 4 teachers or trainers, 3 video editors or social media people, 3 everyday users. Ask:

1. What did you use before, and what made you stop?
2. Watch them use Naqi with a link of their own (one they have the right to save). Do not help.
3. Did anything make you hesitate or not trust it?
4. Did you hit the hourly limit? What did you do?
5. Would you pay $3 a month to remove it? Why or why not?

Write the answers in `replica/launch/interviews.md`. They decide whether Plus happens.

## App stores: read this before building the apps

`listing.json` is ready and passes `listing.py` (0 errors, 0 warnings). It does not name YouTube or any competitor and leads with our own fixes, as Apple's guideline 4.1 (copycats) requires.

The bigger risk is not the listing, it is the function. Google Play and the App Store regularly reject or remove apps whose main purpose is saving videos from streaming sites, especially YouTube, under their intellectual-property rules and the sites' terms. Plan for that:

- Ship the **website first** (it works on phones; it can be installed as a PWA).
- If you build the Android app, expect to distribute it from your own site as an APK, or ship a Play version that leaves YouTube out.
- An iOS app is unlikely to pass review in this category; do not budget for it yet.

Store prep still to do when you get there: screenshots at the current required sizes (check App Store Connect and Play Console at upload time), privacy labels and the Data safety form (we collect no personal data; the anonymous visitor id in a signed cookie, used for the limit, must be declared), privacy and support URLs, age rating, and review notes with a test link the reviewer may legally save.

## Timeline

| week | goal |
| --- | --- |
| 0 | blockers 1 to 6 |
| 1 to 2 | waitlist and private beta, 10 interviews |
| 3 | public launch: website, AlternativeTo, Arabic post, Show HN |
| 4+ | decide on Plus from gate data and interviews; Android app only after that |

Next: `/replica-deploy`.
