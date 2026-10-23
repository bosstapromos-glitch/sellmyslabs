# SellMySlabs

White/blue public website and private submission workspace for Lifestyle Cards & Collectibles. Owner login and notification recipient: `jt@nxtdeal.co` only.

## Development

Install with `npm ci`, then `npm run dev`. Use `npm run build`, `npm test`, and `npm start` for production verification. Next 16 and React 19; dependencies are pinned.

## Production connections

Neon, private Blob storage, and Resend are connected to this Vercel project. The sender domain is verified. The submission endpoint returns an unavailable response when required configuration is incomplete.

- Neon Postgres for submissions, private notes, rate limits and short-lived login tokens.
- Vercel **private** Blob store for photos. Set `BLOB_READ_WRITE_TOKEN` from the project-specific store.
- Resend transactional email, with a verified sending domain and `RESEND_API_KEY`.
- `MAIL_FROM`: a verified sender such as `SellMySlabs <requests@sellmyslabs.net>`.
- `OWNER_EMAIL=jt@nxtdeal.co` (no additional recipients).
- `SITE_URL=https://www.sellmyslabs.net`.
- Independent cryptographically random secrets of at least 32 characters for `SESSION_SECRET` and `CRON_SECRET`.

Use `.env.example` as the variable inventory. Never commit environment values. Run `node --env-file=.env.local scripts/migrate.mjs` once against the intended database before deployment. The migration is additive and repeatable.

Vercel project: `sellmyslabs`, team: `john-towns-projects`. Production branch is `main`. The white/blue release is developed on `redesign/white-blue-tag` and published to `main` after hosted verification.

## Behavior

Customers enter cards (or import up to 50 CSV rows), contact details, and consent; review; then submit. A draft stays on the current browser, excluding photos. Up to eight JPG/PNG/WebP images; the browser accepts originals up to 20 MB each and optimizes them to JPEG before upload. The server enforces 1.5 MB per image and 3 MB total. Request validation and file signature checks run on the server. Photos are stored privately and read only through an authenticated route.

The database commit is authoritative. The customer receives a reference only after the row is saved. The request UUID prevents duplicate inserts. Owner email notifications are attempted after the response; failures remain visible as pending. A daily cron retries pending notifications and removes expired login tokens/rate-limit buckets. Email delivery acceptance is recorded, not a claim of inbox delivery.

Owner access uses a short-lived one-use email link plus an explicit confirmation to avoid email link scanners consuming it. Signed, HTTP-only sessions last 12 hours. No client-side PIN. Saving a positive new or changed total offer automatically emails the seller the offer and card list, with replies to the owner. Notes and status-only changes remain private. Offer saves and an immutable email payload are committed together, with version checks, a send lease, and provider idempotency. The portal records email acceptance and allows safe retries for up to 23 hours after the first attempt; older uncertain sends need manual review. Sent means provider acceptance, not guaranteed inbox delivery.

The inbox currently shows the most recent 500 requests. This initial release does not support customer accounts, automatic payments, shipping labels.

## Hosted release verification

Verified against the hosted preview with the production-connected services:

- A clearly labeled test request containing a TAG card and an original 4.37 MB photo was optimized, saved, and assigned a reference.
- Owner notification and sign-in email both reported delivered to `jt@nxtdeal.co` by Resend.
- The one-use sign-in link creates an owner session; reuse is rejected.
- Authenticated inbox, details, and private photo retrieval work; signed-out requests and photos return 401.
- Status and private notes persist; logout expires the session cookie.
- The launch test remains labeled and Closed, with no real cards or transaction attached.

Check the public domain after each production deployment. Automated tests cover schema, validation, CSV/TAG input, idempotency, token expiry and consumption, and rate limiting.

## Imagery

`public/images/tag-charizard.jpg` is the original high-resolution photograph from TAG's public card record for E9221873 (Charizard ex, 2023 Obsidian Flames, TAG 9). Source: https://my.taggrading.com/card/E9221873 . Asset: https://d39lwrz0lm7c9r.cloudfront.net/slab-images/E9221873_Slabbed_FRONT.jpg . The image source is recorded here; it is not represented as shop inventory. No AI-generated certification number, grade, or card artwork is used.

## Validation performed locally

Production compilation, schema and input tests, CSV/TAG import, duplicate record prevention, saved offer/status, expired and reused login tokens, and rate-limit increment behavior. Browser checks cover desktop design, form navigation, review, TAG selection, failure messaging and draft recovery. Hosted database, private storage, and email checks are recorded above.
