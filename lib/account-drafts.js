import { restoreDraft } from "./draft";
import {
  validUploadId,
  uploadHash,
  resolveUploads,
} from "./submission-uploads";

export const ACCOUNT_DRAFT_SCHEMA = `CREATE TABLE IF NOT EXISTS account_drafts (
 id uuid PRIMARY KEY, customer_user_id text NOT NULL, data jsonb NOT NULL,
 photos jsonb NOT NULL DEFAULT '[]', version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz
);
CREATE INDEX IF NOT EXISTS account_drafts_owner ON account_drafts(customer_user_id,updated_at DESC);`;
export class DraftError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function requireDraftIdentity(identity) {
  if (!identity?.id)
    throw new DraftError("Sign in to save or open your account draft.", 401);
  if (!identity.emails?.length)
    throw new DraftError("Verify your email before saving a draft.", 403);
  return identity.id;
}
export async function draftOwner(id, sql) {
  const [row] = await sql.query(
    "SELECT customer_user_id FROM account_drafts WHERE id=$1",
    [id],
  );
  return row?.customer_user_id;
}
export async function listAccountDrafts(identity, sql) {
  const uid = requireDraftIdentity(identity);
  const rows = await sql.query(
    "SELECT id,data,photos,version,updated_at FROM account_drafts WHERE customer_user_id=$1 AND closed_at IS NULL AND updated_at>now()-interval '30 days' ORDER BY updated_at DESC LIMIT 20",
    [uid],
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.data.cards?.[0]?.name || "Untitled collection",
    photoCount: row.photos.length,
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}
export async function readAccountDraft(identity, id, sql) {
  const uid = requireDraftIdentity(identity);
  if (!validUploadId(id)) throw new DraftError("Draft not found.", 404);
  const [row] = await sql.query(
    "SELECT * FROM account_drafts WHERE id=$1 AND customer_user_id=$2 AND closed_at IS NULL AND updated_at>now()-interval '30 days'",
    [id, uid],
  );
  if (!row)
    throw new DraftError(
      "This draft is no longer available. It may have been submitted or cleared.",
      404,
    );
  const hashes = row.photos.map((p) => uploadHash(p.token));
  const uploads = hashes.length
    ? await sql.query(
        "SELECT token_hash,created_at FROM submission_uploads WHERE submission_id=$1 AND token_hash=ANY($2::text[]) AND created_at>now()-interval '30 days'",
        [id, hashes],
      )
    : [];
  const available = new Map(
    uploads.map((u) => [
      u.token_hash,
      new Date(u.created_at).getTime() + 30 * 86400000,
    ]),
  );
  const photos = row.photos.flatMap((p, index) =>
    available.has(uploadHash(p.token))
      ? [
          {
            token: p.token,
            name: p.name,
            expiresAt: available.get(uploadHash(p.token)),
            previewUrl: `/api/account/drafts/photo?id=${id}&photo=${uploadHash(p.token)}`,
          },
        ]
      : [],
  );
  return {
    id,
    data: row.data,
    version: row.version,
    photos,
    expiredCount: row.photos.length - photos.length,
  };
}
export async function saveAccountDraft(identity, body, sql) {
  const uid = requireDraftIdentity(identity);
  const { id, version, data, photos } = body || {};
  if (
    !validUploadId(id) ||
    !Number.isInteger(version) ||
    version < 0 ||
    !data ||
    data.id !== id ||
    !Array.isArray(photos) ||
    photos.length > 100
  )
    throw new DraftError("Please check this draft and try again.");
  if (
    photos.some(
      (p) =>
        !p ||
        typeof p.token !== "string" ||
        !/^[a-f\d]{64}$/.test(p.token) ||
        typeof p.name !== "string" ||
        p.name.length > 255,
    ) ||
    new Set(photos.map((p) => p.token)).size !== photos.length
  )
    throw new DraftError("Please check the saved photos.");
  if (photos.length)
    await resolveUploads(
      id,
      photos.map((p) => p.token),
      sql,
    );
  const clean = restoreDraft(JSON.stringify(data), () => id);
  const refs = photos.map((p) => ({ token: p.token, name: p.name }));
  const [submitted] = await sql.query(
    "SELECT id FROM submissions WHERE id=$1",
    [id],
  );
  if (submitted)
    throw new DraftError("This request has already been submitted.", 409);
  let rows;
  if (version === 0) {
    rows = await sql.query(
      `INSERT INTO account_drafts(id,customer_user_id,data,photos)
   SELECT $1,$2,$3::jsonb,$4::jsonb WHERE (SELECT count(*) FROM account_drafts WHERE customer_user_id=$2 AND closed_at IS NULL AND updated_at>now()-interval '30 days')<20
   ON CONFLICT(id) DO NOTHING RETURNING version`,
      [id, uid, JSON.stringify(clean), JSON.stringify(refs)],
    );
  } else {
    rows = await sql.query(
      "UPDATE account_drafts SET data=$3::jsonb,photos=$4::jsonb,version=version+1,updated_at=now() WHERE id=$1 AND customer_user_id=$2 AND version=$5 AND closed_at IS NULL AND updated_at>now()-interval '30 days' RETURNING version",
      [id, uid, JSON.stringify(clean), JSON.stringify(refs), version],
    );
  }
  if (!rows.length)
    throw new DraftError(
      version === 0
        ? "This draft could not be added. Open an existing account draft or clear an older draft if you have 20 saved."
        : "This draft changed on another device. Open the latest saved version before continuing.",
      409,
    );
  return { id, version: rows[0].version };
}
export async function closeAccountDraft(identity, id, version, sql) {
  const uid = requireDraftIdentity(identity);
  if (!validUploadId(id) || !Number.isInteger(version))
    throw new DraftError("Invalid draft.");
  const rows = await sql.query(
    "UPDATE account_drafts SET closed_at=now(),version=version+1 WHERE id=$1 AND customer_user_id=$2 AND version=$3 AND closed_at IS NULL RETURNING id",
    [id, uid, version],
  );
  if (!rows.length)
    throw new DraftError(
      "This draft changed on another device. Reload it before clearing.",
      409,
    );
  return { cleared: true };
}
export async function accountDraftPhoto(identity, id, key, sql) {
  const uid = requireDraftIdentity(identity);
  if (
    !validUploadId(id) ||
    typeof key !== "string" ||
    !/^[a-f\d]{64}$/.test(key)
  )
    throw new DraftError("Photo not found.", 404);
  const [draft] = await sql.query(
    "SELECT photos FROM account_drafts WHERE id=$1 AND customer_user_id=$2 AND closed_at IS NULL AND updated_at>now()-interval '30 days'",
    [id, uid],
  );
  const ref = draft?.photos.find((p) => uploadHash(p.token) === key);
  if (!ref) throw new DraftError("Photo not found.", 404);
  const [photo] = await resolveUploads(id, [ref.token], sql);
  return {
    pathname: photo.previewPathname || photo.pathname,
    type: photo.previewPathname ? "image/jpeg" : photo.type,
  };
}
// Claim the exact draft revision and insert the request in one atomic SQL statement.
export const SUBMIT_ACCOUNT_DRAFT_SQL = `WITH claimed AS (
 UPDATE account_drafts SET closed_at=now(),version=version+1 WHERE id=$1 AND customer_user_id=$2 AND version=$3 AND closed_at IS NULL RETURNING id
) INSERT INTO submissions(id,customer_user_id,seller_name,email,phone,seller_notes,cards,photos,asking_total)
SELECT id,$2,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::numeric FROM claimed ON CONFLICT(id) DO NOTHING RETURNING id`;
