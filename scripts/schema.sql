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
