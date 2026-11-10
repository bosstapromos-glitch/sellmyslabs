import { createHash, randomBytes, randomUUID } from "node:crypto";
import { MAX_SUBMISSION_PHOTOS } from "./photo-selection";

export class UploadValidationError extends Error {}

export const MAX_PHOTO_BYTES = 350000;
export const UPLOAD_SCHEMA = `CREATE TABLE IF NOT EXISTS submission_uploads (
 token_hash text PRIMARY KEY, submission_id uuid NOT NULL,
 photo jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS submission_uploads_created ON submission_uploads(created_at);
CREATE INDEX IF NOT EXISTS submission_uploads_request ON submission_uploads(submission_id);`;
export const uploadHash = (token) =>
  createHash("sha256").update(token).digest("hex");
export const validUploadId = (id) =>
  typeof id === "string" &&
  /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(id);

export function imageType(bytes) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  return null;
}

export async function stagePhoto(id, file, { sql, put, del }) {
  if (!validUploadId(id)) throw Error("Please reload the form and try again.");
  if (
    typeof file?.arrayBuffer !== "function" ||
    !file.size ||
    file.size > MAX_PHOTO_BYTES
  )
    throw Error("This photo is too large. Please choose it again.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = imageType(bytes);
  if (!type) throw Error("Choose a JPG, PNG or WebP photo.");
  const [existing] = await sql.query("SELECT id FROM submissions WHERE id=$1", [
    id,
  ]);
  if (existing)
    throw Error(
      "This request has already been sent. Start a new request to add photos.",
    );
  const [count] = await sql.query(
    "SELECT count(*)::int AS count FROM submission_uploads WHERE submission_id=$1 AND created_at>now()-interval '30 days'",
    [id],
  );
  if (count.count >= MAX_SUBMISSION_PHOTOS * 2)
    throw Error(
      "This draft has reached its upload limit. Please send it or start a new request.",
    );
  const token = randomBytes(32).toString("hex");
  const blob = await put(`submissions/${id}/uploads/${randomUUID()}`, bytes, {
    access: "private",
    contentType: type,
    addRandomSuffix: true,
  });
  const photo = { url: blob.url, pathname: blob.pathname, type };
  try {
    const [row] = await sql.query(
      "INSERT INTO submission_uploads(token_hash,submission_id,photo) VALUES($1,$2,$3::jsonb) RETURNING created_at",
      [uploadHash(token), id, JSON.stringify(photo)],
    );
    return {
      token,
      expiresAt: new Date(row.created_at).getTime() + 30 * 86400000,
    };
  } catch (error) {
    await del(blob.url).catch(() => {});
    throw error;
  }
}

// Only server-stored uploads belonging to this draft may become submission photos.
export async function resolveUploads(id, tokens, sql) {
  if (
    !Array.isArray(tokens) ||
    !tokens.length ||
    tokens.length > MAX_SUBMISSION_PHOTOS ||
    tokens.some((t) => typeof t !== "string" || !/^[a-f\d]{64}$/.test(t)) ||
    new Set(tokens).size !== tokens.length
  )
    throw new UploadValidationError(
      `Add between 1 and ${MAX_SUBMISSION_PHOTOS} different photos before sending.`,
    );
  const hashes = tokens.map(uploadHash);
  const rows = await sql.query(
    "SELECT token_hash,photo FROM submission_uploads WHERE submission_id=$1 AND token_hash=ANY($2::text[]) AND created_at>now()-interval '30 days'",
    [id, hashes],
  );
  if (rows.length !== tokens.length)
    throw new UploadValidationError(
      "Some photos have expired or could not be found. Remove them and add them again.",
    );
  const byHash = new Map(rows.map((row) => [row.token_hash, row.photo]));
  return hashes.map((hash) => byHash.get(hash));
}

// One-day grace beyond acceptance expiry prevents cleanup racing a submission.
export async function cleanupUploads(sql, del) {
  const rows = await sql.query(`SELECT u.token_hash,u.photo,
    EXISTS(SELECT 1 FROM submissions s WHERE s.id=u.submission_id AND s.photos @> jsonb_build_array(u.photo)) AS attached
    FROM submission_uploads u WHERE u.created_at<now()-interval '31 days' ORDER BY u.created_at LIMIT 100`);
  let cleaned = 0;
  for (const row of rows) {
    if (!row.attached) await del(row.photo.url);
    await sql.query("DELETE FROM submission_uploads WHERE token_hash=$1", [
      row.token_hash,
    ]);
    cleaned++;
  }
  return cleaned;
}
