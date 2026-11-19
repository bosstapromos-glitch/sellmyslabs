import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { imageType } from "./submission-uploads";
import { MAX_PHOTO_BYTES } from "./photo-selection";
import { cleanLabel, labelText } from "./photo-labels";

// The shop asks a seller to replace specific photos on a request that has
// already been sent. The seller gets a private link; each new photo takes the
// place of the old one, which is kept on the record as `previous`.

export const MAX_RETAKE_PHOTOS = 20;
export const RETAKE_DAYS = 30;
export class RetakeError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
function signature(id, secret) {
  if (!secret || secret.length < 32)
    throw new Error("Retake links are not configured.");
  // A separate purpose from offer links and owner sessions: this signature
  // only lets its holder replace the photos named in one retake request.
  return createHmac("sha256", secret)
    .update(`photo-retake:v1:${id}`)
    .digest("base64url");
}
export function retakeToken(id, secret = process.env.SESSION_SECRET) {
  if (!UUID.test(id)) throw new Error("Invalid retake ID.");
  return `${id}.${signature(id, secret)}`;
}
export function retakeId(token, secret = process.env.SESSION_SECRET) {
  if (typeof token !== "string" || token.length > 100) return null;
  const [id, supplied, extra] = token.split(".");
  if (
    !UUID.test(id || "") ||
    !/^[A-Za-z0-9_-]{43}$/.test(supplied || "") ||
    extra !== undefined
  )
    return null;
  const expected = signature(id, secret);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    return null;
  return id;
}
export const retakePath = (id) => `/retake/${retakeToken(id)}`;

const RETAKE_SQL = `SELECT r.id,r.submission_id,r.photos,r.note,r.created_at,r.closed_at,r.email_status,
 r.created_at>now()-interval '${RETAKE_DAYS} days' AS current,
 s.seller_name,s.email,s.cards,s.photos AS submission_photos
 FROM photo_retakes r JOIN submissions s ON s.id=r.submission_id`;

// What each requested photo is, and whether the seller has replaced it.
function describe(row) {
  return row.photos.map((index) => {
    const photo = row.submission_photos[index] || {};
    const label = cleanLabel(photo, row.cards.length);
    return {
      index,
      label: labelText(label) || `Photo ${index + 1}`,
      item: label.item === null ? "" : row.cards[label.item]?.name || "",
      done: photo.retake === row.id,
    };
  });
}

export function retakeSummary(row) {
  if (!row) return null;
  const photos = describe(row);
  return {
    id: row.id,
    createdAt: row.created_at,
    note: row.note,
    emailStatus: row.email_status,
    open: !row.closed_at && row.current,
    photos,
    replaced: photos.filter((photo) => photo.done).length,
  };
}

export async function latestRetake(sql, submissionId) {
  const [row] = await sql.query(
    `${RETAKE_SQL} WHERE r.submission_id=$1 ORDER BY r.created_at DESC LIMIT 1`,
    [submissionId],
  );
  return retakeSummary(row);
}

// The seller's view: no email address, no storage paths.
export async function publicRetake(sql, token) {
  const id = retakeId(token);
  if (!id) return null;
  const [row] = await sql.query(`${RETAKE_SQL} WHERE r.id=$1`, [id]);
  if (!row || row.closed_at || !row.current) return null;
  return {
    reference: row.submission_id.slice(0, 8).toUpperCase(),
    sellerName: row.seller_name,
    note: row.note,
    photos: describe(row),
  };
}

export async function createRetake(sql, { submissionId, photos, note }) {
  if (!UUID.test(submissionId || ""))
    throw new RetakeError("Request not found.", 404);
  const indexes = Array.isArray(photos) ? [...new Set(photos)] : [];
  if (
    !indexes.length ||
    indexes.length > MAX_RETAKE_PHOTOS ||
    indexes.some((index) => !Number.isInteger(index) || index < 0)
  )
    throw new RetakeError(
      `Choose between 1 and ${MAX_RETAKE_PHOTOS} photos to retake.`,
    );
  const text = typeof note === "string" ? note.trim() : "";
  if (text.length > 1000)
    throw new RetakeError("Keep the note under 1,000 characters.");
  const [submission] = await sql.query(
    "SELECT jsonb_array_length(photos) AS count FROM submissions WHERE id=$1",
    [submissionId],
  );
  if (!submission) throw new RetakeError("Request not found.", 404);
  if (indexes.some((index) => index >= submission.count))
    throw new RetakeError("One of those photos is no longer on this request.");
  const id = randomUUID();
  // One open request at a time, so an older link cannot undo a newer one.
  await sql.query(
    "UPDATE photo_retakes SET closed_at=now() WHERE submission_id=$1 AND closed_at IS NULL",
    [submissionId],
  );
  await sql.query(
    "INSERT INTO photo_retakes(id,submission_id,photos,note) VALUES($1,$2,$3::jsonb,$4)",
    [id, submissionId, JSON.stringify(indexes.sort((a, b) => a - b)), text],
  );
  return id;
}

export function retakeMessage(row, { from, replyTo, url }) {
  const lines = describe(row).map(
    (photo) => `- ${photo.label}${photo.item ? ` (${photo.item})` : ""}`,
  );
  const reference = row.submission_id.slice(0, 8).toUpperCase();
  return {
    from,
    to: [row.email],
    reply_to: replyTo,
    ...(row.email.toLowerCase() !== replyTo.toLowerCase()
      ? { bcc: [replyTo] }
      : {}),
    subject: `New photos needed for your request · ${reference}`,
    text: `Hi ${row.seller_name},\n\nThanks for your request. To review it properly we need a clearer photo of:\n\n${lines.join("\n")}\n${row.note ? `\nNote from our team: ${row.note}\n` : ""}\nUse this private link to take or choose the new photos. It works for ${RETAKE_DAYS} days:\n\n${url}\n\nTips: fill the frame with the item, use bright even light with no flash, and tap the label to focus.\n\nKeep this link private. Reply to this email if you have any questions.\n\nThank you,\nSellMySlabs`,
  };
}

export async function deliverRetakeEmail(
  id,
  { sql, mailConfig, fetchEmail = fetch },
) {
  const [row] = await sql.query(`${RETAKE_SQL} WHERE r.id=$1`, [id]);
  if (!row) return "failed";
  let status = "failed";
  try {
    const { from, replyTo, site } = mailConfig();
    if (!process.env.RESEND_API_KEY || !from)
      throw Error("Email not connected");
    const response = await fetchEmail("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `retake-${id}`,
      },
      body: JSON.stringify(
        retakeMessage(row, { from, replyTo, url: site + retakePath(id) }),
      ),
    });
    const data = await response.json();
    if (response.ok && data.id) status = "sent";
  } catch {}
  await sql.query("UPDATE photo_retakes SET email_status=$2 WHERE id=$1", [
    id,
    status,
  ]);
  return status;
}

// Puts the seller's new photo in place of the old one. The old photo's
// storage path stays on the record as `previous`; nothing is deleted.
export async function replaceRetakePhoto(
  { sql, put, del = async () => {} },
  { token, index, file, preview },
) {
  const id = retakeId(token);
  const [row] = id
    ? await sql.query(`${RETAKE_SQL} WHERE r.id=$1`, [id])
    : [];
  if (!row || row.closed_at || !row.current)
    throw new RetakeError(
      "This link is no longer active. Contact our shop for a new one.",
      404,
    );
  if (!Number.isInteger(index) || !row.photos.includes(index))
    throw new RetakeError("That photo was not requested.");
  const old = row.submission_photos[index];
  if (!old) throw new RetakeError("That photo is no longer on this request.");
  if (
    typeof file?.arrayBuffer !== "function" ||
    !file.size ||
    file.size > MAX_PHOTO_BYTES
  )
    throw new RetakeError("This photo is too large. Please choose it again.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = imageType(bytes);
  if (!type) throw new RetakeError("Choose a JPG, PNG or WebP photo.");
  let previewBytes;
  if (preview) {
    if (
      typeof preview.arrayBuffer !== "function" ||
      !preview.size ||
      preview.size > 100000
    )
      throw new RetakeError("This photo preview is too large.");
    previewBytes = Buffer.from(await preview.arrayBuffer());
    if (imageType(previewBytes) !== "image/jpeg")
      throw new RetakeError("Choose a JPG photo preview.");
  }
  const blob = await put(
    `submissions/${row.submission_id}/retakes/${randomUUID()}`,
    bytes,
    { access: "private", contentType: type, addRandomSuffix: true },
  );
  const { previous: _earlier, previewPathname: _p, previewUrl: _u, ...kept } = old;
  const next = {
    ...kept,
    url: blob.url,
    pathname: blob.pathname,
    type,
    retake: id,
    retakenAt: new Date().toISOString(),
    // Keep the original the seller first sent, even across several retakes.
    previous: old.previous || {
      url: old.url,
      pathname: old.pathname,
      type: old.type,
    },
  };
  const stored = [blob.url];
  try {
    if (previewBytes) {
      const small = await put(`${blob.pathname}-preview`, previewBytes, {
        access: "private",
        contentType: "image/jpeg",
        addRandomSuffix: true,
      });
      stored.push(small.url);
      next.previewPathname = small.pathname;
      next.previewUrl = small.url;
    }
    // Only replace the photo this request was made about.
    const [updated] = await sql.query(
      "UPDATE submissions SET photos=jsonb_set(photos,ARRAY[$2::text],$3::jsonb) WHERE id=$1 AND photos->$2::int->>'pathname'=$4 RETURNING id",
      [row.submission_id, index, JSON.stringify(next), old.pathname],
    );
    if (!updated)
      throw new RetakeError(
        "This photo changed while you were uploading. Reload the page and try again.",
        409,
      );
  } catch (error) {
    await del(stored).catch(() => {});
    throw error;
  }
  const photos = describe({
    ...row,
    submission_photos: row.submission_photos.map((photo, i) =>
      i === index ? next : photo,
    ),
  });
  return { photos, complete: photos.every((photo) => photo.done) };
}

export function createAdminRetakeHandler({
  sql,
  signedIn,
  sameOrigin,
  mailConfig,
  deliver = deliverRetakeEmail,
}) {
  return async function POST(request) {
    if (!(await signedIn()))
      return Response.json({ error: "Please sign in." }, { status: 401 });
    if (!sameOrigin(request))
      return Response.json(
        { error: "Please use this website." },
        { status: 403 },
      );
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Please try again." }, { status: 400 });
    }
    try {
      const db = sql();
      const id = await createRetake(db, {
        submissionId: body?.id,
        photos: body?.photos,
        note: body?.note,
      });
      await deliver(id, { sql: db, mailConfig });
      return Response.json(
        { retake: await latestRetake(db, body.id) },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      if (error instanceof RetakeError)
        return Response.json({ error: error.message }, { status: error.status });
      return Response.json(
        { error: "The retake request could not be saved. Please try again." },
        { status: 503 },
      );
    }
  };
}

export function createRetakeUploadHandler({
  sql,
  put,
  del,
  configured,
  sameOrigin,
  limited,
}) {
  return async function POST(request, context) {
    if (!sameOrigin(request))
      return Response.json(
        { error: "Please upload from this website." },
        { status: 403 },
      );
    if (!configured())
      return Response.json(
        { error: "Photo uploads are temporarily unavailable. Please try again shortly." },
        { status: 503 },
      );
    if (
      Number(request.headers.get("content-length")) >
      MAX_PHOTO_BYTES + 150000
    )
      return Response.json(
        { error: "Please choose a smaller photo." },
        { status: 413 },
      );
    try {
      if (await limited(request, "retake-photo", 120))
        return Response.json(
          { error: "Too many uploads. Please try again in an hour." },
          { status: 429 },
        );
      const { token } = await context.params;
      const form = await request.formData();
      const result = await replaceRetakePhoto(
        { sql: sql(), put, del },
        {
          token,
          index: Number(form.get("index")),
          file: form.get("photo"),
          preview: form.get("preview"),
        },
      );
      return Response.json(result, {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error) {
      if (error instanceof RetakeError)
        return Response.json({ error: error.message }, { status: error.status });
      return Response.json(
        {
          error:
            "This photo could not upload. Check your connection and try again.",
        },
        { status: 503 },
      );
    }
  };
}
