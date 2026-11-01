CREATE TABLE IF NOT EXISTS submissions (
 id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(),
 seller_name text NOT NULL, email text NOT NULL, phone text NOT NULL DEFAULT '',
 seller_notes text NOT NULL DEFAULT '', cards jsonb NOT NULL, photos jsonb NOT NULL DEFAULT '[]',
 status text NOT NULL DEFAULT 'New', internal_notes text NOT NULL DEFAULT '', offer numeric(14,2),
 updated_at timestamptz NOT NULL DEFAULT now(), notified_at timestamptz
);
CREATE INDEX IF NOT EXISTS submissions_created ON submissions(created_at DESC);
CREATE TABLE IF NOT EXISTS login_tokens (hash text PRIMARY KEY, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits (key text NOT NULL, bucket bigint NOT NULL, hits integer NOT NULL DEFAULT 1, PRIMARY KEY(key,bucket));
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS offer_version integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS offer_emails (
 id uuid PRIMARY KEY, submission_id uuid NOT NULL REFERENCES submissions(id),
 version integer NOT NULL, amount numeric(14,2) NOT NULL CHECK(amount>0),
 payload jsonb NOT NULL, status text NOT NULL DEFAULT 'pending',
 created_at timestamptz NOT NULL DEFAULT now(), first_attempt_at timestamptz,
 locked_until timestamptz, lease_id uuid, sent_at timestamptz, provider_id text,
 error text, UNIQUE(submission_id,version)
);
CREATE INDEX IF NOT EXISTS offer_emails_submission ON offer_emails(submission_id,created_at DESC);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS asking_total numeric(14,2) CHECK(asking_total > 0);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS offer_message text NOT NULL DEFAULT '';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS offer_photos jsonb NOT NULL DEFAULT '[]';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS edit_version integer NOT NULL DEFAULT 0;
ALTER TABLE offer_emails ADD COLUMN IF NOT EXISTS purchase_snapshot jsonb;
ALTER TABLE offer_emails ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE offer_emails ADD COLUMN IF NOT EXISTS accepted_name text;
CREATE TABLE IF NOT EXISTS purchase_receipts (
 offer_id uuid PRIMARY KEY REFERENCES offer_emails(id), payload jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(),
 first_attempt_at timestamptz, locked_until timestamptz, lease_id uuid,
 sent_at timestamptz, provider_id text, error text
);
