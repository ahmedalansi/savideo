# Recon map: savevideo.net (web, desktop + mobile browsers)

Scope: the core loop of the website only. Paste a link, see the video's details and qualities, optionally trim, download. Plus the free-limit gate and the extension/app promotion surfaces. The Chrome extension and Android app are recorded for reference but are not part of the MVP.
For: our own branded downloader MVP (clean-room). Audience to be confirmed (see Open questions).
Date: 2026-10-25

Method: read-only review of public pages at human speed (no crawling, no JS bundles, no network-call logging, no account). All descriptions below are in our own words; no text, images, logo, layout or code from the original were saved. No screenshots were captured in this pass (no browser was connected), so `replica/screens/` is empty.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | marketing / home (tool + how-to + FAQ) | https://savevideo.net/ | main tool, settings panel, FAQ topics, footer |
| 2 | YouTube downloader page | https://savevideo.net/youtube/download-youtube-videos/ | hourly limit rules, length/quality rules, link formats |
| 3 | Browser extension page | https://savevideo.net/extension/video-downloader-extension/ | what the extension adds vs the site |
| 4 | Android app page | https://savevideo.net/mobile-app/ | app vs site, install path |
| 5 | Terms | https://savevideo.net/terms/ | user responsibility, prohibited uses, no hosting |
| 6 | Copyright / DMCA, Privacy, EULA | /copyright/, /privacy/, /eula/ | linked from footer, not read in detail yet |

## Core loop

A visitor pastes a public video link and gets an MP4 (or MP3) file saved to their device in a chosen quality, with no sign-up.

## Key findings that differ from the project brief

1. **The free limit is 3 YouTube downloads per hour, not 3 downloads total.** It applies only to YouTube on the website. Other platforms have no count. The counter resets at the top of each hour, and the user is shown how long until the next free download. The site does not say whether it counts per device, per IP or otherwise.
2. **The website caps YouTube at 1080p.** 1440p/4K/8K for YouTube is only offered via the browser extension. 4K on the website appears only for other platforms when the source has it (e.g. Bilibili, Pinterest).
3. **YouTube videos of 10 minutes or longer are limited to 360p** on the website (max length handled about 3 hours; audio-only up to about 4 hours).
4. **No visible display ads** were found on the pages read. Ads may load via scripts that a text read does not show, so the ad model in the brief is unverified. The visible monetization is pushing users to the extension and the app (and a separate paid desktop app for some extras).

These look like deliberate business rules (to drive installs and limit YouTube load), not technical limits. We need to decide which ones we copy (see Open questions).

## Supported platforms (as advertised)

| platform | video | audio (MP3) | notes |
| --- | --- | --- | --- |
| YouTube (videos, Shorts, playlists) | yes, up to 1080p on site | yes | hourly limit, 10-min/360p rule |
| Facebook | yes | yes | |
| X / Twitter | yes | no | video only |
| Reddit | yes | yes | |
| Dailymotion | yes | yes | |
| Bilibili | yes, up to 4K if source has it | yes | |
| Twitch | mentioned | unknown | listed in passing, no dedicated page seen |
| TikTok | yes | no | not in our brief |
| Instagram (Reels) | yes | unknown | not in our brief |
| Pinterest, Weibo | yes | no | not in our brief |
| SoundCloud | via a sister audio site | yes | out of scope |

Accepted YouTube link shapes: `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, `youtube.com/playlist?list=`. A watch link that also carries a playlist parameter downloads just that one video.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Home / downloader | `/` | paste a link and start | URL input, Paste button, quality selector, demo-video link, Download button, platform grid, how-to (3 steps), FAQ, tools directory | empty, filled, invalid link |
| S02 | Processing | same page after submit | fetch video info | progress / status message | loading, error |
| S03 | Result panel | same page | pick format and quality | thumbnail, title, Video / Audio tabs, quality list with file sizes, per-row download button | filled, size updates on trim |
| S04 | Trim control | inside S03 | cut a clip | start and end time fields | default (full length), edited |
| S05 | Download in progress / done | inside S03 | deliver the file | status messages | preparing, downloading, done, failed |
| S06 | Limit reached gate | inside S03 when YouTube count hits 3/hour | stop free use, promote install | countdown to next free download, extension CTA, app CTA | limit reached |
| S07 | Playlist result | after pasting a playlist link | pick videos one by one | list of up to 20 videos (more with extension), one button each | filled |
| S08 | Settings panel | header toggle | preferences | theme (4 options), default quality, language (24), clean UI toggle, recent downloads toggle | open, closed |
| S09 | Recent downloads | inside settings / home | re-find past items on this device | list stored locally | empty, filled |
| S10 | Platform landing pages | e.g. `/youtube/...`, `/fb/...` | SEO pages, same tool pre-scoped | S01 tool + platform-specific how-to/FAQ | same as S01 |
| S11 | Extension page | `/extension/...` | promote the browser extension | store buttons (Chrome, Edge, Brave, Opera), comparison table | static |
| S12 | Mobile app page | `/mobile-app/` | promote the Android app | Play Store link, QR code | static |
| S13 | Tools directory | "All tools" menu | list of per-platform and utility tools | link grid | static |
| S14 | Legal pages | `/terms/`, `/privacy/`, `/eula/`, `/copyright/` | legal | text | static |
| S15 | About / Contact | `/about/`, `/contact/` | company info, contact | text, contact method | static |

## Flows

```
F01 Download a video (happy path)
    S01 paste link -> S02 processing -> S03 pick quality -> S05 file saved
    happy path clicks: 3 (Paste, Download/submit, quality row). If the default quality
    is set, it can be 2.
    edge: invalid / unsupported URL, private or removed video, age-restricted, live stream,
          geo-blocked, very long video, source has no audio track merged (needs mux),
          network failure mid-download

F02 Download audio only
    S01 -> S02 -> S03 Audio tab -> MP3 row -> S05
    edge: platform has no audio option (X, TikTok) -> tab hidden or disabled

F03 Trim then download
    S01 -> S02 -> S03 -> S04 set start/end -> sizes update -> pick quality -> S05
    edge: end before start, end beyond duration, zero-length clip, time format (mm:ss vs hh:mm:ss)

F04 Hit the YouTube free limit
    (3 YouTube downloads in the current hour) S01 -> S02 -> S03 -> S06 gate
    S06 options: wait for countdown | install extension (S11) | install app (S12)
    edge: counter scope unknown (device vs IP), reset at top of the hour, other platforms unaffected

F05 Try with a demo video
    S01 "use a demo" -> S02 -> S03 (demo item)

F06 Playlist
    S01 paste playlist link -> S02 -> S07 list -> pick one -> S03 -> S05

F07 Address-bar shortcut
    On a YouTube page the user edits the domain to the site's shortcut domain -> lands on S01/S03 prefilled
    (theirs uses a specific prefix; we would need our own domain-based variant)

F08 Change preferences
    S08 theme / default quality / language / clean UI / recent downloads toggle

F09 Mobile (iOS Safari)
    F01 on phone -> file goes to the Files app Downloads; user can add site to Home Screen
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| URL input | with Paste button | empty, focused, filled, invalid | S01, S10 |
| Button | primary (download), secondary, link-style | default, hover, focus, disabled, loading | all |
| Quality selector | dropdown / segmented (Best, 4K, 1080p, 720p, MP3) | selected | S01, S08 |
| Tabs | Video / Audio | active, disabled | S03 |
| Quality row | label, file size, download button | default, downloading, done, unavailable | S03 |
| Media card | thumbnail, title, duration | loading skeleton, filled | S03, S07 |
| Time range input | start / end | valid, invalid | S04 |
| Status message / toast | info, error, success | | S02, S05 |
| Limit gate | countdown + CTAs | | S06 |
| Platform grid | icon + name tiles | | S01, S10 |
| FAQ accordion | | open, closed | S01, S10 |
| Settings drawer | | open, closed | S08 |
| Theme switch | auto, dark variants, light | | S08 |
| Language picker | | | S08 |
| Header nav / footer | | | all |

## Inferred data model

```
MediaInfo   source_url, platform, title, duration_s, thumbnail_url,
            formats[] (format_id, kind video|audio, height, ext, filesize_estimate, needs_merge)
            evidence: S03 shows title, thumbnail, sizes per quality
            confidence: high (transient, not stored by the original per its terms)

DownloadJob id, media_url, format_id, trim_start_s?, trim_end_s?, status
            (queued | processing | ready | failed), created_at
            evidence: S05 status messages, trim updates sizes
            confidence: medium

QuotaCounter key (device/IP, scope unknown), platform=youtube, window=current clock hour,
            count, limit=3
            evidence: YouTube page and FAQ
            confidence: medium (limit and window high, key guess)

Preferences theme, default_quality, language, clean_ui, keep_history
            stored client-side
            evidence: S08
            confidence: high

RecentDownload  title, source_url, quality, saved_at (client-side only)
            evidence: S09 option says list kept on the device
            confidence: medium
```

Relationships: MediaInfo 1-n DownloadJob. QuotaCounter is per visitor key. Preferences and RecentDownload live in the browser, no user accounts.

## Feature matrix

See `features.csv`. Must: 11, should: 9, could: 7, skip: 5.

## Constraints and hard parts

- **Platform blocking:** YouTube and others throttle or block datacenter IPs. Needs a proxy strategy and frequent extractor updates (yt-dlp).
- **Merging streams:** above 720p YouTube serves video and audio separately, so the server must merge them (FFmpeg), which costs CPU and time.
- **Trimming:** server-side cut with FFmpeg; accurate cuts need re-encoding, which is slow for long or high-res clips.
- **Streaming to the browser:** large files should stream without being stored long-term (the original says it does not host content).
- **Quota keying:** without accounts, counting per IP/device is easy to bypass and can hit shared IPs.
- **Bandwidth cost:** proxying full video bytes through our server is the main running cost.
- **iOS Safari:** downloads land in Files, behavior differs from desktop.

## Out of scope (cannot or should not be cloned)

- Their brand, name, logo, copy, articles, FAQ text, icons and layout.
- The browser extension, Android app and paid desktop app (later phases, per the brief).
- The "vid" shortcut as-is (it relies on their specific domain trick).
- 24-language localization (MVP: English, maybe Arabic later).
- The SEO network of per-platform landing pages and sister sites.

## Legal and ToS notes

- The original puts copyright responsibility on the user, says it does not host content, and forbids scraping, reverse engineering and automated high-volume use of its service. Our recon stayed within that: manual reading of public pages only.
- YouTube's Terms of Service prohibit downloading content except where YouTube provides a download link or has written permission. A YouTube downloader carries real ToS and takedown risk; many such sites have received legal pressure, and app stores and ad networks may refuse them.
- Other platforms (Meta, X, TikTok, Twitch) have similar clauses.
- We will need: a clear user-responsibility disclaimer, a DMCA / takedown process, a privacy policy (IP-based quota is personal data in some regions), and no storage of downloaded files.

## Open questions for the owner

1. Free limit: copy the original (3 YouTube downloads per hour, other platforms unlimited) or the brief's version (3 downloads total across all platforms)?
2. YouTube quality on the web: offer up to 4K (more server cost, more risk) or cap at 1080p like the original?
3. Platform list for the MVP: the brief's seven (YouTube, Facebook, X, Reddit, Twitch, Bilibili, Dailymotion), or add TikTok and Instagram which the original features heavily?
4. Long videos: do we want a length or quality cap (the original uses 10 min -> 360p)?
5. Revenue: ads were not visible on the original. Do we still plan ads for the MVP, or an upgrade path only?
6. Audience and languages: global English only, or English + Arabic at launch?

## Size

Screens 15 (about 8 that matter for the MVP), flows 9, entities 5. Hard parts: platform blocking and proxies, stream merging and trimming at scale, bandwidth cost, legal exposure. Size: M (a few weeks for a working MVP, with ongoing maintenance).
