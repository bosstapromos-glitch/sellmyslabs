import { CONSIGNMENT_STATUSES } from "../../../../lib/sale-method";
import { STATUSES } from "../../../../lib/validation";
import { randomUUID } from "node:crypto";
import { purchaseSnapshot } from "../../../../lib/purchase-terms";
import { purchasePath } from "../../../../lib/purchase-token";
import { owner } from "../../../../lib/security";
import { siteUrl } from "../../../../lib/origin";
import { offerMessage } from "../../../../lib/offer-message";
import { SAVE_OFFER_SQL } from "../../../../lib/offer-records";
import {
  deliverOffer,
  offerEmailSummary,
} from "../../../../lib/offer-delivery";
import { db } from "../../../../lib/db";
import { signedIn, sameOrigin } from "../../../../lib/security";
import { updateSchema } from "../../../../lib/validation";
import {
  prepareOfferPhotos,
  offerPhotoSummary,
} from "../../../../lib/offer-photos";
export const maxDuration = 60;
export async function GET(request) {
  if (!(await signedIn()))
    return Response.json(
      { error: "Sign in to view submissions." },
      { status: 401 },
    );
  try {
    const sql = db();
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      if (!/^[a-f\d-]{36}$/i.test(id))
        return Response.json({ error: "Invalid ID" }, { status: 400 });
      const [row] = await sql`SELECT * FROM submissions WHERE id=${id}`;
      if (!row)
        return Response.json({ error: "Request not found" }, { status: 404 });
      const accepted =
        await sql`SELECT id,amount,accepted_at,accepted_name FROM offer_emails WHERE submission_id=${id} AND accepted_at IS NOT NULL ORDER BY accepted_at DESC`;
      return Response.json(
        {
          submission: {
            ...row,
            offer_photos: offerPhotoSummary(row.offer_photos),
            offer_email: await offerEmailSummary(id),
            acceptances: accepted.map((offer) => ({
              ...offer,
              url: purchasePath(offer.id),
            })),
            photos: row.photos.map((p, i) => ({ index: i, type: p.type })),
          },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const rows =
      await sql`SELECT id,created_at,seller_name,status,sale_method,jsonb_array_length(cards) AS card_count,notified_at FROM submissions ORDER BY created_at DESC LIMIT 500`;
    return Response.json(
      { submissions: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Could not load requests." },
      { status: 500 },
    );
  }
}
export async function PATCH(request) {
  if (!sameOrigin(request) || !(await signedIn()))
    return Response.json({ error: "Please sign in again." }, { status: 401 });
  try {
    if (Number(request.headers.get("content-length")) > 1200000)
      return Response.json(
        { error: "Please use up to 3 smaller sales photos." },
        { status: 413 },
      );
    let raw,
      files = [];
    try {
      if (
        request.headers.get("content-type")?.includes("multipart/form-data")
      ) {
        const form = await request.formData();
        raw = JSON.parse(form.get("data"));
        files = form.getAll("salesPhotos");
      } else raw = await request.json();
    } catch {
      return Response.json(
        { error: "The offer could not be read. Please try again." },
        { status: 400 },
      );
    }
    const parsed = updateSchema.safeParse(raw);
    if (!parsed.success)
      return Response.json(
        {
          error:
            parsed.error.issues.find((issue) => issue.path[0] === "offer")
              ?.message ||
            "Check the message, photos and private notes, then try again.",
        },
        { status: 400 },
      );
    const d = parsed.data;
    if (
      d.requestAcceptance &&
      (!d.offer || ["Closed", "Paid"].includes(d.status))
    )
      return Response.json(
        {
          error:
            "Use an active request with a total offer before sending purchase terms.",
        },
        { status: 400 },
      );
    const sql = db();
    const [submission] = await sql`SELECT * FROM submissions WHERE id=${d.id}`;
    if (!submission)
      return Response.json({ error: "Request not found" }, { status: 404 });
    if (
      submission.sale_method === "consignment" &&
      (d.offer || d.requestAcceptance)
    )
      return Response.json(
        {
          error:
            "This is a consignment request. Direct-purchase offers and purchase terms cannot be sent for it.",
        },
        { status: 400 },
      );
    if (
      !(
        submission.sale_method === "consignment"
          ? CONSIGNMENT_STATUSES
          : STATUSES
      ).includes(d.status)
    )
      return Response.json(
        { error: "Choose a status for this request type." },
        { status: 400 },
      );
    let photos;
    try {
      photos = await prepareOfferPhotos(
        submission.offer_photos,
        d.keepPhotoIds,
        files,
      );
    } catch (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    const sellerMessage = d.sellerMessage ?? submission.offer_message ?? "";
    if (d.offer && (!process.env.MAIL_FROM || !process.env.RESEND_API_KEY))
      return Response.json(
        { error: "Email is not connected. The offer was not changed." },
        { status: 503 },
      );
    const offerEmailId = randomUUID();
    const offered = {
      ...submission,
      offer_message: sellerMessage,
      offer_photos: photos,
    };
    const snapshot = d.offer ? purchaseSnapshot(offered, d.offer) : null;
    const payload = d.offer
      ? offerMessage(offered, d.offer, {
          from: process.env.MAIL_FROM,
          replyTo: owner(),
          site: siteUrl(),
          acceptanceUrl: `${siteUrl()}${purchasePath(offerEmailId)}`,
        })
      : null;
    const [saved] = await sql.query(SAVE_OFFER_SQL, [
      d.id,
      d.status,
      d.notes,
      d.offer || null,
      d.offerVersion,
      offerEmailId,
      JSON.stringify(payload),
      sellerMessage,
      JSON.stringify(photos),
      snapshot ? JSON.stringify(snapshot) : null,
      d.requestAcceptance,
      d.editVersion,
    ]);
    if (!saved)
      return Response.json(
        {
          error:
            "This request changed or an email is sending. Reopen it before saving again.",
        },
        { status: 409 },
      );
    try {
      if (saved.queued_email) await deliverOffer(saved.queued_email);
    } catch {
      // The saved offer and pending email remain recoverable from the inbox.
      console.error("Offer email needs retry");
    }
    return Response.json({
      ok: true,
      saved: { ...saved, offer_photos: offerPhotoSummary(saved.offer_photos) },
      offer_email: await offerEmailSummary(d.id),
    });
  } catch {
    return Response.json(
      { error: "Changes could not be saved." },
      { status: 500 },
    );
  }
}
