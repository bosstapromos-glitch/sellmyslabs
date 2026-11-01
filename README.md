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

Owner access uses a short-lived one-use email link plus an explicit confirmation to avoid email link scanners consuming it. Signed, HTTP-only sessions last 12 hours. No client-side PIN. Saving a positive new or changed total offer automatically emails the seller the offer and card list, with replies to the owner. Private notes and status-only changes remain private. The optional seller message and up to three sales images are included in the offer email and owner copy. Changing the price, seller message or sales images sends an updated offer; the button explicitly reads “Save & email offer.” Without a price, these details can be saved as a draft. Offer saves and an immutable email payload are committed together, with version checks, a send lease, and provider idempotency. The portal records email acceptance and allows safe retries for up to 23 hours after the first attempt; older uncertain sends need manual review. Sent means provider acceptance, not guaranteed inbox delivery.

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

## Mobile and home-screen support

The customer form uses 16px fields, touch-sized buttons, rear-camera capture and incremental photo selection. HEIC/HEIF photos first use native decoding; unsupported browsers load the pinned `heic-to` decoder in a background worker. Processing stays on the device and produces the same bounded JPEG uploads as before. A failed or cancelled selection preserves already attached photos. Photos are not persisted in drafts.

At phone and tablet widths, the owner inbox opens one request at a time with an Inbox return control. Private photos open in a full-height viewer with fit/full-size modes and previous/next controls. Alt links remain owner-only and slab-only; they do not provide automatic values or session monitoring.

The manifest, 512px application icon, Apple touch icon and safe-area spacing support Add to Home Screen. This is an online web app foundation, not an App Store release. There is no service worker or offline storage of private requests/photos. Existing owner session expiry and offer-email behavior are unchanged.

HEIC conversion uses heic-to 1.6.6 (LGPL-3.0-or-later), unmodified. License: `/licenses/heic-to.txt`. Package source: https://registry.npmjs.org/heic-to/-/heic-to-1.6.6.tgz ; upstream source and build instructions: https://github.com/hoppergee/heic-to .

## Offer explanations and sales photos

Run the additive schema migration before deploying this feature. Owner sales images use the existing browser photo conversion, with a server-verified limit of three images and 350 KB per image. They are stored privately in Postgres with the current offer; immutable email snapshots include the Base64 attachments for safe retries. API responses expose only photo metadata, with authenticated, uncached image retrieval. Private notes never enter the seller email payload. Older JSON clients preserve existing seller messages/photos; current clients send a multipart request.

Email attachments use the provider’s supported content/filename format: https://resend.com/docs/api-reference/emails/send-email . The application’s limits are deliberately smaller than the provider maximum.


## Purchase terms and seller acceptance

Run `scripts/migrate.mjs` with the deployment's `DATABASE_URL` before releasing this addition. The migration adds owner edit versions, immutable purchase snapshots and acceptance fields to offer emails, and a separate confirmation-email outbox. No existing offer is accepted, changed or re-emailed by migration.

New offer emails link to `/offer/<scoped-token>`. Links use a purpose-separated HMAC with the existing session secret; rotating that secret invalidates old links, so coordinate rotation and replacement links. These are private bearer links: possession grants access to that specific offer. The pages and API are uncached, exclude indexing and snippets, and send no referrer. They expose no internal notes, contact phone, asking price, database payload or other requests.

Each newly emailed offer freezes its item list, total, seller-facing note, business details, full terms and agreement statement. Sellers enter their name and explicitly check an initially unchecked agreement checkbox. Acceptance locks the submission, rechecks the current offer and request status, records the name/time, marks the request Agreed, increments its edit version, and queues a receipt in one database statement. Stale owner tabs and superseded offer links cannot replace an acceptance. Repeated acceptance keeps the original signer and timestamp and does not enqueue another receipt. Earlier accepted versions remain available as receipts when a revised offer is sent.

The owner can email an existing active priced request with terms using **Email offer with purchase terms**. This deliberately sends another offer email; there is no bulk or automatic backfill of existing customer offers. New private note/status changes do not send offers. Changing seller-facing content creates another immutable offer; a previously Agreed request returns to Offer ready when revised.

Confirmation receipts contain the exact terms, items, price, statement, signer and time. They go to the original offer recipient with a private owner copy, deduplicated for owner-addressed tests. Delivery uses leases and stable provider idempotency keys with a 23-hour retry window. An email failure does not undo acceptance. The owner can retry an eligible confirmation, and the notifications job also retries up to three receipts per run. Provider acceptance is labeled sent, not delivered/read.

Business policy supplied by the owner: seller pays outbound shipping and insurance; inspection within 72 hours of delivery; payment initiated the same day inspection confirms the items match; ACH, wire, Zelle, Cash App or Venmo; seller pays return shipping; one total offer for the listed collection. Terms are versioned in `lib/purchase-terms.js`. Change the version for future policy revisions. Existing snapshots must remain immutable. No automatic payment, bank-detail collection or shipping-label feature is introduced.
