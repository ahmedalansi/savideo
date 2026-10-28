# Components: savideo design system

Date: 2026-10-25. Source: `replica/recon.md` (components table, screens S01 to S14), `replica/architecture.md`.

## How this was made

The recon pass captured no screenshots (`replica/screens/` is empty), so nothing here was measured from the original site. This is our own system, built from the component list and states in the recon map plus the states it should have. That is the safer side of clean-room anyway: same jobs, our own look.

- Tokens: `tokens.json` (light) and `tokens.dark.json` (dark), same role names. `build_css.py` writes `tokens.css` and `tailwind.theme.css`. Components use role utilities only (`bg-surface text-muted border-border-input rounded-md`), never raw hex or px.
- Tailwind v4 setup in `app/globals.css`:
  ```css
  @import "tailwindcss";
  @import "../design/tokens.css";
  @import "../design/tailwind.theme.css";
  ```
  Theme: `<html data-theme="light|dark">`, or no attribute for "follow the system". Arabic: `<html lang="ar" dir="rtl">` switches the font to IBM Plex Sans Arabic and loosens line height.
- Fonts (all SIL OFL, load with `next/font/google`): Inter, IBM Plex Sans Arabic, JetBrains Mono (time fields only).
- Icons: Lucide (ISC licence), 20px in buttons, 1.75 stroke. Platform tiles use our own monochrome glyph plus the platform name as text. We do not draw platform logos as decoration, and never in a way that suggests a partnership.
- Accessible base: Radix primitives (via shadcn/ui) for Tabs, Accordion, Dialog/Sheet, Select, Toast. We restyle them with our tokens.
- `accent` is a placeholder blue. `/replica-brand` replaces it and re-runs the contrast check.

## Global rules

- **Focus:** every interactive element shows `shadow-focus` (2px bg gap + 2px `focus` ring) on `:focus-visible`. Never `outline: none` without it.
- **Tap targets:** 44px minimum height on touch (`layout.tap-min`), even when the visual is smaller.
- **Motion:** `motion.fast` for hover/press, `motion.base` for panels. All motion drops to 0 under `prefers-reduced-motion`.
- **RTL:** logical properties only (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `text-start`). Directional icons (arrows, chevrons) flip with `rtl:-scale-x-100`. Time values, file sizes and URLs stay LTR inside RTL text (`dir="ltr"` on the element, `unicode-bidi: isolate`).
- **Numbers:** Western digits everywhere, including Arabic UI, because times and sizes get copied and compared.
- **Copy:** every string lives in the `next-intl` message files, EN and AR, written fresh. Example strings below are placeholders in our own words.

## Primitives

```
Button
  variants  primary (accent fill), secondary (surface fill, border), ghost (no fill), danger (danger fill)
  sizes     sm 32px (text-sm), md 40px (text-sm/600), lg 52px (text-base/600, the main Download button)
  states    default, hover (accent-hover / surface darken), active (translateY 1px), focus-visible (shadow-focus),
            disabled (40% opacity, no pointer, aria-disabled), loading (spinner replaces the leading icon, label stays)
  tokens    bg accent, text on-accent, radius md, padding-inline 16/20/24, gap 8, transition motion.fast
  a11y      real <button> (or <a> for navigation). Loading sets aria-busy="true" and keeps the visible label,
            so the screen reader still says what the button does. Icon-only buttons need aria-label.
  used on   all
```

```
IconButton
  variants  ghost, secondary
  sizes     32px, 40px (44px hit area on touch)
  states    default, hover, focus-visible, disabled, pressed (aria-pressed for toggles)
  tokens    text muted -> text on hover, radius md
  a11y      aria-label required; tooltip mirrors the label on hover/focus
  used on   header (settings, theme), quality rows (copy link)
```

```
UrlInput  (the hero field)
  layout    one row: link icon, text field, Paste button (ghost, inline-end), then the primary Download button.
            At < 640px the Download button drops below the field at full width.
  sizes     56px tall on desktop, 52px on mobile, radius lg
  states    empty (placeholder "Paste a video link"), focused (border accent + shadow-focus), filled (clear X appears),
            pasting (Paste button shows a short check), invalid (border danger, message below with an icon),
            unsupported site (warning tone, lists supported platforms), submitting (field read-only, button loading)
  tokens    bg surface-raised, border border-input, text base, placeholder text-muted, radius lg, shadow card
  a11y      <label> visible above or visually hidden ("Video link"), type="url", inputmode="url",
            autocomplete="off", enterkeyhint="go", aria-invalid + aria-describedby to the error.
            Paste uses the Clipboard API; when denied, it focuses the field and shows a hint to press Ctrl/Cmd+V.
            Enter submits. The field is dir="ltr" even in Arabic.
  used on   S01, S10
```

```
TextField / TimeField
  sizes     40px, radius md
  states    default, hover (border text-muted), focus (border accent + shadow-focus), invalid (border danger + message),
            disabled, read-only
  tokens    bg bg, border border-input, text sm/base
  TimeField accepts m:ss, mm:ss or h:mm:ss, font mono, dir="ltr", inputmode="numeric" plus ":" key,
            arrow up/down nudge by 1 s (Shift = 10 s), normalises on blur (75 -> 1:15)
  a11y      visible label, error text linked with aria-describedby, role="alert" only on submit
  used on   S04, legal forms
```

```
SegmentedControl  (Video / Audio, and default quality in settings)
  variants  2 to 5 segments
  states    selected (bg surface-raised + shadow card inside a surface track), hover, focus-visible, disabled segment
  tokens    track bg surface, radius md (track) / sm (thumb), text sm/600
  a11y      Radix Tabs (role="tablist") when it switches panels, radio group when it picks a value.
            Arrow keys move between segments. A disabled Audio tab (X, TikTok) stays visible with a reason in a tooltip.
  used on   S03 (Video/Audio), S08 (default quality, theme)
```

```
Badge
  variants  neutral, accent, success, warning, danger; "4K", "HD", "MP3", "No audio", "Merged"
  sizes     20px, text xs/600, radius pill, padding-inline 8
  tokens    subtle background + strong text of the same role (accent-subtle / accent etc.)
  a11y      text, not colour alone
  used on   S03 quality rows, S07
```

```
Spinner / ProgressBar
  Spinner   16 or 20px, currentColor, 0.8 s rotation (static dot under reduced motion), aria-hidden when beside a label
  Progress  determinate (bytes known, pass-through path) or indeterminate (merge/trim/MP3 stream, no total size);
            4px track bg skeleton, fill accent, radius pill. role="progressbar" with aria-valuenow when known.
  used on   S02, S05
```

```
Skeleton
  blocks    thumbnail 16:9, two text lines (60% and 40%), three quality rows
  tokens    bg skeleton, radius sm, shimmer 1.4 s (off under reduced motion)
  a11y      container aria-busy="true", one visually hidden "Loading video details" live message
  used on   S02 -> S03
```

## Composite components

```
MediaCard  (S03 header, S07 rows)
  layout    thumbnail (16:9, radius md, duration chip on the bottom inline-end corner) + title (lg/600, 2 lines max,
            ellipsis) + meta line (platform name, duration, text-muted sm). Stacked on mobile, side by side >= 640px.
  states    loading (Skeleton), filled, thumbnail failed (surface block with film icon), long title (60+ chars clamps),
            RTL title (dir="auto" on the title, because titles can be any language)
  tokens    bg surface-raised, border border, radius lg, shadow card, padding 16/24
  a11y      thumbnail alt = title; the card is not a link
```

```
QualityRow  (S03 list)
  layout    label ("1080p", "MP3 192 kbps") + badges + size ("about 84 MB", text-muted, dir ltr) + Download button (secondary md;
            the recommended row uses primary). Rows separated by border, whole list in a card.
  states    default, hover (bg surface), preparing (button loading "Preparing"), downloading (progress under the row),
            done (success check, "Saved", button turns into "Download again"), unavailable (disabled with reason:
            "Too large", "Not offered for this site"), quota blocked (button opens the LimitGate)
  tokens    height 56px, padding-inline 16, text sm/base
  a11y      list semantics (<ul>), each button's accessible name includes the quality: "Download 1080p, about 84 MB".
            Status changes announced in one polite live region for the whole list.
  used on   S03, S05
```

```
TrimControl  (S04, inside S03)
  layout    "Trim" disclosure (collapsed by default) -> two TimeFields (Start, End) side by side + "Full video" reset link,
            a range bar showing the selected part of the duration, and the clip length ("Clip: 0:40").
  states    collapsed, default (0:00 to full duration), edited, invalid (end <= start, end > duration, clip < 1 s;
            message under the fields, Download buttons disabled), keyframe note (text-muted xs:
            "Cuts snap to the nearest keyframe, so the clip may start a second or two early.")
  tokens    bg surface, radius md, padding 16, range fill accent
  a11y      disclosure is a <button aria-expanded>; range bar is decorative (aria-hidden), the fields are the control.
            Sizes in QualityRow update and are announced once, after typing stops (500 ms debounce).
  used on   S03/S04
```

```
StatusMessage / Toast  (S02, S05)
  variants  info (accent-subtle), success (success-subtle), warning (warning-subtle), error (danger-subtle)
  layout    icon + one sentence + optional action ("Try again", "See supported sites"). Inline under the input
            for resolve errors; toast (bottom-center mobile, bottom inline-end desktop) for download results.
  states    each variant; toast auto-hides after 5 s except errors; pauses on hover/focus
  error copy map (API error code -> our message key): invalid_url, unsupported_site, private_video, removed_video,
            age_restricted, live_stream, geo_blocked, too_long, too_large, busy (auto retry with countdown),
            platform_down (kill switch), network
  a11y      inline errors role="alert"; toasts in an aria-live="polite" region; never colour alone (icon + text)
  used on   S01, S02, S05
```

```
QuotaMeter + LimitGate  (F04, S06)
  QuotaMeter  small line under the input: three dots plus "2 of 3 free downloads left this hour" (text-muted xs).
              Hidden when the visitor has used none.
  LimitGate   replaces the quality list's buttons when the quota is used up (not a blocking modal, so the visitor
              can still read the page): clock icon, heading "You've used this hour's free downloads",
              live countdown "Next free download in 23:14" (mono, dir ltr), primary CTA to /apps
              ("Get the extension, coming soon"), secondary "Remind me" is out of scope for MVP.
  states      counting down, reset reached (gate fades out, buttons return, polite announcement)
  tokens      bg warning-subtle, text text, icon warning, radius lg, padding 24
  a11y        countdown text updates every second visually but announces only at reset (aria-live off on the timer)
  used on     S01, S03, S06
```

```
PlatformGrid  (S01, S10)
  layout    tiles 2 cols mobile, 4 cols >= 768px, 7 in one row >= 1024px. Each tile: our monochrome glyph + name.
  states    default, hover (border accent), focus-visible, "coming soon" (muted, not a link)
  tokens    bg surface, border border, radius md, padding 16, text sm/600
  a11y      links to the per-platform page when it exists; otherwise plain list items
  used on   S01, S10
```

```
HowTo steps  (S01)
  layout    three numbered cards (number in an accent-subtle circle), our own short copy, row on desktop, stack on mobile
  a11y      <ol>
```

```
FAQ Accordion  (S01, S10, /faq)
  base      Radix Accordion, type="multiple"
  states    closed, open (chevron rotates 180), hover, focus-visible
  tokens    border-bottom border, question base/600, answer sm text-muted, padding-block 16
  a11y      button per question with aria-expanded/aria-controls; headings level fits the page outline
```

```
SettingsSheet  (S08)
  base      Radix Dialog as a side sheet (inline-end side, 360px; bottom sheet on mobile)
  contents  Theme (System / Light / Dark segmented), Default quality (Best / 1080p / 720p / MP3),
            Language (English / العربية select), Keep recent downloads on this device (switch), Clear history
  tokens    bg surface-raised, shadow pop, radius xl (mobile top corners), overlay rgba(0,0,0,.4)
  a11y      focus trapped, Esc closes, focus returns to the gear button, title is the dialog label
  used on   all pages (header)
```

```
Switch
  sizes     36x20, thumb 16
  states    off (track border-input), on (track accent), focus-visible, disabled
  a11y      role="switch" aria-checked, label clickable
  used on   S08
```

```
RecentList  (S09)
  layout    up to 20 rows: small thumbnail, title, quality + date (text-muted xs), "Open link" ghost button
  states    empty ("Nothing yet. Downloads you make will show up here, only on this device."), filled, cleared
  used on   S08/S09
```

```
Header / Footer
  Header    64px, sticky, bg bg with border-bottom border; logo slot (placeholder wordmark until /replica-brand),
            nav: FAQ, Apps; gear IconButton for settings. Mobile: logo + gear only.
  Footer    surface background, three link groups (Product, Legal, Contact), the user-responsibility line,
            "We don't store the files you download." Legal links: Terms, Privacy, Copyright & takedowns.
  a11y      <header>, <nav aria-label>, <footer>; skip link "Skip to the downloader" as the first focusable element
```

```
Disclaimer line  (S01, S03)
  layout    one sentence under the Download area, text-muted xs, link to /terms and /copyright
  copy      "Only download videos you own or have permission to save. You're responsible for how you use them."
```

## Page layout

- Content max 1120px, tool column max 720px, centred. Gutter 16px mobile, 24px desktop.
- Home order: Header, hero (display heading + one line + UrlInput + QuotaMeter + Disclaimer), result area (S02 to S06 appear here, the page scrolls the result into view), PlatformGrid, HowTo, FAQ, Footer.
- Vertical rhythm between sections: 64px mobile, 96px desktop. Inside cards: 16 / 24.

## Coverage against the recon

| recon component | here |
| --- | --- |
| URL input | UrlInput |
| Button | Button, IconButton |
| Quality selector | SegmentedControl (settings), QualityRow (result) |
| Tabs | SegmentedControl as Tabs |
| Quality row | QualityRow |
| Media card | MediaCard + Skeleton |
| Time range input | TrimControl + TimeField |
| Status message / toast | StatusMessage / Toast |
| Limit gate | QuotaMeter + LimitGate |
| Platform grid | PlatformGrid |
| FAQ accordion | FAQ Accordion |
| Settings drawer | SettingsSheet + Switch |
| Theme switch | SegmentedControl in SettingsSheet (System / Light / Dark; the original's four themes trimmed to three) |
| Language picker | Select in SettingsSheet |
| Header nav / footer | Header / Footer |

Added beyond the recon: Badge, Spinner/ProgressBar, Skeleton, Switch, RecentList, HowTo, Disclaimer line, skip link.

## Contrast report

`python3 tools/replica-skill/replica-design/contrast.py replica/design/tokens.json` and the same for `tokens.dark.json`: 20 light pairs and 22 dark pairs, **0 failing AA**. Lowest: `border-input` on `surface` 3.37:1 light (UI, needs 3), `accent` on `accent-subtle` 4.83:1 light (needs 4.5).

## Primitives preview

`preview.html` renders every primitive and its states with `tokens.css`, in light, dark and Arabic RTL. Screenshots: `preview-light.png`, `preview-dark.png`, `preview-rtl.png`. When the Next.js repo exists, `/replica-build` ports these into `components/ui/` and a `/design` route.
