# Pricing: Naqi

Written 2026-10-26 by /replica-launch.

## Recommendation in one line

Launch **free only**. Show Plus on the page as "planned" so people know how we will pay for the service, and turn it on only after the legal review, accounts, and a check that a payment provider will accept us.

## What others charge

| product | model | price | source, date read |
| --- | --- | --- | --- |
| savevideo.net (the original) | free web tool; pushes a browser extension and Android app; recon saw a separate paid desktop app | **no public pricing page found**; the site itself is blocked from this workspace, and a web search found no price | `replica/recon.md`; search 2026-10-26 |
| 4K Video Downloader Plus (desktop app) | yearly or one-time licence | Lite $15/year, Personal $25 one-time, Pro $45 one-time | [Capterra](https://www.capterra.com/p/10038360/4K-Video-Downloader-Plus/), page updated 2026-10-21, read 2026-10-26 |
| SaveFrom.net | free web tool, no paid tier listed | free | [Techjockey](https://www.techjockey.com/detail/savefrom-net), read 2026-10-26 |
| SaveTheVideo | free web tool | free | [SaaSworthy](https://www.saasworthy.com/product/savethevideo-com/pricing), data dated 2025-05-26, read 2026-10-26 |

These are third-party listings, not the vendors' own pricing pages (those were not reachable from here). Check the vendor pages before you publish anything that compares prices. The web tools in this category are free and paid for by ads, which is exactly what our angle rejects.

## What reviewers said about price and billing

From `replica/feedback.md`, theme "Paid plans and billing": **7 reviews, 3 sources, average 1.6 stars.**

- charged without warning (y2mate, Spanish review)
- paid for a monthly plan, then denied access (y2mate, German)
- paid, then told after updates they only had a trial (y2mate, German)
- "waste of time and money" (savefrom.com.in)

And on the limit itself: one 1-star complains about "3 videos then waiting 30 minutes", which is almost exactly our free plan.

## The model

| | Free | Plus (planned) |
| --- | --- | --- |
| for | everyday saving | people who save a lot |
| price | $0, no account | **$3 a month or $30 a year** (two months free) |
| downloads | 3 per hour | no hourly limit, fair use (suggest 200 a day) |
| quality | every quality the source has, up to 4K | same |
| trim, MP3 | yes | yes |
| ads | never | never |
| extras | | whole playlists in one go, longer videos (raise the 3 h cap) |

Why these numbers: under the cheapest desktop licence ($15/year) per month, a price people pay without thinking, and the annual plan lands at $30, close to the one-time desktop licences. Two tiers only; a third (teams, classrooms) waits until teachers or editors actually show up (they were a thin signal in the research). Show local currency at checkout (SAR, AED, EGP) once the provider supports it.

No free trial: the free plan is the trial.

## Fixing the billing complaints in the product

- **One-click cancel** from the account page, no email or chat needed. Access lasts to the end of the paid period.
- **Reminder email 7 days before every renewal**, with the amount, the date and the cancel link. Annual plans also get one at 30 days.
- **No silent changes:** a price change applies only after an email and the next renewal.
- **Receipt by email** for every charge, with what it was for.
- **Plus works the moment payment clears.** If the check fails, the account page says so and support refunds without questions in the first 14 days. This fixes "paid and was denied access".
- Never call a paid plan a trial, and never auto-convert a trial (there is none).

## What has to exist before Plus goes on sale

1. Legal review of the service (still the blocker from `parity.md`).
2. **A payment provider that accepts a video download service.** Card processors and merchant-of-record services review what you sell, and tools that download from streaming sites are a category they look at closely. Ask Stripe (or Paddle, Lemon Squeezy) before writing billing code. I have not confirmed any provider's stance.
3. Accounts: email sign-in (magic link), because Plus needs to know who paid. The free plan stays account-free.
4. The quota check in `app/api/app/main.py` reads a Plus entitlement before counting.

## Stripe products and prices to create (you create them)

| object | value |
| --- | --- |
| Product | `Naqi Plus`, description "No hourly limit, playlists, longer videos. No ads." |
| Price 1 | `plus_monthly`: 3.00 USD, recurring, monthly |
| Price 2 | `plus_yearly`: 30.00 USD, recurring, yearly |
| Customer portal | on; cancel allowed, "at end of billing period"; plan switching monthly to yearly allowed |
| Emails | Stripe settings: send upcoming renewal reminders, receipts for successful payments, and failed payment emails |
| Tax | Stripe Tax on if you sell where you must collect VAT (EU, UK, Gulf states with VAT) |

## Decide later, with data

Turn Plus on when the limit gate is seen by a meaningful share of returning visitors (count gate views per day, no personal data). If almost nobody hits the gate, Plus would not pay for itself, and a donation link is the honest alternative.

The open question from `/replica-diff` still applies: the free limit counts **all** platforms (stricter than the original, which counts only YouTube). Loosening it to YouTube only is a config change.
