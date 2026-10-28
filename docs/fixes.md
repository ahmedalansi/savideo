# What users hate about video downloader sites, and how we fix it

Written 2026-10-26 by /replica-entrepreneur (followed `tools/replica-skill/replica-entrepreneur/SKILL.md`; it is not installed as a slash command).
Data: `replica/reviews.csv` (139 reviews), ranked in `replica/feedback.md` with `replica/themes-video.json`.

## Read this first: what the sample is and is not

- **These are not reviews of savevideo.net.** It has no Trustpilot page (the review URL returns an error), and its extension page shows "5.0, 2,195 ratings" with no link to any store, so those ratings cannot be checked. So this is research on the category: real reviews of 8 direct competitor sites that do the same job.
- **Sample:** 139 reviews, 136 with stars, 65 of them 1 or 2 stars. 9 sources: Trustpilot pages for ssvid.net, y2mate.com, ssyoutube.com, ytmp3.cc, savefrom.net (two domains), savefrom.com.in, downr.org, savethevideo.com, plus AlternativeTo for savefrom.net. Dates 2020 to Aug 2026, most from 2024 to 2026.
- **Not reached:** Reddit and Hacker News are blocked from this workspace, Trustpilot star filters are disallowed for automated reading, and y2mate's other Trustpilot locales returned errors. Rerun Step 1 from a normal browser to add Reddit, HN and the Chrome Web Store.
- **Quotes are verbatim but often only the opening of a review:** the page reader caps quotes at about 125 characters. Every row has its page link. Non-English reviews are kept in their own language.
- **"Sources" below means the competitor site being reviewed**, so "7 sources" means seven different products got the same complaint.

The strongest single signal is the gap in scores: ssvid.net, whose reviewers keep praising "no ads", has TrustScore 4.8 from 1,936 reviews. The ad-heavy ones sit at 2.1 (y2mate, 51 reviews), 2.6 (ssyoutube, 12), 2.6 (savefrom.com.in, 15) and 3.0 (ytmp3, 54).

## 1. What they hate

1. **Pop-ups, redirects and shady ads.** 40 reviews, 7 sources, avg 2.3 stars.
   - "the pop_up ads are the main problem, it keeps redirecting to another page which makes downloading hectic" ([y2mate](https://jp.trustpilot.com/review/y2mate.com))
   - "Click download, takes you to ad, nothing happens, go back to page, wash rinse repeat." ([ytmp3](https://it.trustpilot.com/review/ytmp3.cc))
2. **Malware scares, forced installs and pushy extensions.** 28 reviews, 6 sources, avg 1.5 stars. The lowest-rated theme.
   - "I can't even use it without being forced to download a stupid browser extension!" ([y2mate](https://jp.trustpilot.com/review/y2mate.com?page=2))
   - "Said my computer had a virus. I checked and it didn't." ([ssyoutube](https://ca.trustpilot.com/review/ssyoutube.com))
3. **Downloads fail with a vague error.** 23 reviews, 5 sources, avg 1.6 stars.
   - "always states after awhile that there was an error." ([ssvid](https://www.trustpilot.com/review/ssvid.net?page=5))
   - "trash, everytime you download gets to the end and fails" ([y2mate](https://jp.trustpilot.com/review/y2mate.com?page=2))
4. **Paid plans that do not deliver, surprise charges.** 7 reviews, 3 sources. Goes to /replica-launch.
   - "Aconsejo no comprar Y2mate ... porque te pasan cobros sin aviso" ([y2mate](https://jp.trustpilot.com/review/y2mate.com))
5. **Slow site or downloads.** 6 reviews, 4 sources.
   - "this site loading slowly sometimes. Can we fix this and make it faster loading ?" ([savefrom.com.in](https://es.trustpilot.com/review/savefrom.com.in))
6. **Confusing results.** 3 reviews, 3 sources (thin).
   - "it is terribly confusing without a title and there's several of them" ([ssvid](https://www.trustpilot.com/review/ssvid.net?page=5))

## 2. What is missing

1. **Full quality without installing anything or watching an ad.** 7 reviews, 5 sources.
   - "only allows you to export at 360p resolution, unless you install the Downr Extension" ([downr](https://br.trustpilot.com/review/downr.org))
   - "For YouTube videos above 720p, it requires you download "free" and "safe" software" ([AlternativeTo](https://alternativeto.net/software/savefrom-net/about))
   - "It was good till the update where u need to watch ad to download best quality" ([ytmp3](https://it.trustpilot.com/review/ytmp3.cc))
   This matters for us: per recon, the original caps YouTube at 1080p on the web and keeps 4K for its extension. Same pattern.
2. **Long and large videos that actually finish.** 5 reviews, 2 sources (thin). Praise for "even 2hrs long" and "videos one hour +", a 1-star for a 28 min 1080p file that failed.
3. **Audio extras.** Thin, one review each: vocal removal, Spotify playlists (Spotify is DRM, we skip it).
4. **Trim.** Thin, one review, but it is the only feature a reviewer named as a favourite: "My favorite feature is "cut video"" ([savethevideo](https://ie.trustpilot.com/review/savethevideo.com)). We already have it.

## 3. What is unsolved

1. **A downloader you can trust.** People assume every site in this category is a trap: "Plethora of fake apps But this works" ([savefrom](https://ca.trustpilot.com/review/en.savefrom.net)), "Nothing is for free, just remember that" ([ytmp3](https://it.trustpilot.com/review/ytmp3.cc)). Praise is mostly for the absence of harm: "This site has bever asked me for anything." ([ssvid](https://www.trustpilot.com/review/ssvid.net?page=4)). 11 trust reviews across 5 sources, plus the ads and malware themes.
2. **Sites vanish.** "Discontinuation of Service in the United States" (ssvid), "ever since cobalt tools went down", "ever since ogmp3 stopped working". People keep switching. Being the one that keeps working is a position.
3. **Teachers and editors.** Thin: "download teaching videos for my classroom", "as an editor", "for my projects". Not enough to build on yet.

## 4. Fix plan

Ranked by evidence times cost. All added to `features.csv` with `original` = `no`.

| # | change | size | skill | evidence |
| --- | --- | --- | --- | --- |
| 1 | **Clean-download promise:** no ad networks, no pop-unders, no new tabs. One click gives one file. Strict CSP, and an e2e test that fails if a download click opens a window or navigates away. | S | replica-build, replica-test | ads, 40 reviews, 7 sources |
| 2 | **Never require an install for any quality.** Keep 1080p and 4K on the web. At the limit gate, the main option is to wait (countdown); the extension or app is only an optional extra, never the only way forward. Change the gate copy and the `/apps` CTA. | S | replica-build | malware/installs 28 and 6; quality cap 7 and 5 |
| 3 | **Honest errors with a next step:** each error says why (private, region, too long, platform down) and offers Retry. A public "platform status" line fed by the existing canary, so users see "YouTube: working" before pasting. | M | replica-backend, replica-build | fails, 23 reviews, 5 sources |
| 4 | **No fear tactics, ever:** no "virus detected" banners, no fake countdowns, no "you won". One plain privacy page: no account, what we log, we sell nothing. | S | replica-build, replica-launch | malware/trust, 11 trust reviews, 5 sources |
| 5 | **Long-video reliability:** keep resume (Range) and add a progress estimate for files over 500 MB, tested with a 2 h video on the VPS. | M | replica-backend, replica-test | limits, 5 reviews (thin) |
| 6 | **Speed budget:** home page under 100 KB JS, resolve answer under 3 s at p50, measured at deploy. | S | replica-deploy | slow, 6 reviews, 4 sources |
| 7 | **Clear result rows:** the saved filename uses the video title, and every row shows quality, format and size. | S | replica-build | confusing, 3 reviews (thin) |

Pricing and billing (theme 4): if we ever sell a plan, no auto-renew surprise and one-click cancel. Passed to /replica-launch.

One warning from the data: a 1-star says "Was doing fine downloading 3 videos then waiting 30 minutes and downloading 3 more." ([ytmp3](https://it.trustpilot.com/review/ytmp3.cc)). That is our free limit almost exactly. It is one review, so thin, but it is worth knowing before launch.

## 5. The angle

**A. Clean (recommended)**
For people who are tired of downloader sites that hide the button behind pop-ups, redirects and fake virus warnings, our app is the clean one: one click, one file, no ads, nothing to install.
Evidence: ads (40 reviews, 7 sources) and malware/forced installs (28 reviews, 6 sources), the two biggest themes; ssvid's 4.8 against 2.1 to 3.0 for the ad-heavy sites.

**B. Full quality, no strings**
For people who are told to install an extension or watch an ad before they get HD, our app gives 1080p and 4K right on the page.
Evidence: quality cap, 7 reviews, 5 sources.

**C. The one that keeps working**
For people whose downloader keeps breaking or shutting down, our app tells you what is working right now and why a link failed.
Evidence: fails, 23 reviews, 5 sources; shutdown mentions across 3 sources.

A is recommended because it covers the two largest and angriest themes and costs almost nothing to deliver (fixes 1, 2 and 4 are all size S). B and C work well as supporting lines under A's hero. A drives /replica-brand (a calm, trustworthy name and voice) and /replica-launch (hero line).

Do not name savevideo.net or any competitor in our name, ads or listings. The quotes above are research; they do not go on the landing page.

Next: /replica-brand.
