import { randomUUID } from "node:crypto";
import { owner } from "../../../../lib/security";
import { siteUrl } from "../../../../lib/origin";
import { offerMessage } from "../../../../lib/offer-message";
import { SAVE_OFFER_SQL } from "../../../../lib/offer-records";
import { deliverOffer, offerEmailSummary } from "../../../../lib/offer-delivery";
import { db } from "../../../../lib/db";
import { signedIn, sameOrigin } from "../../../../lib/security";
import { updateSchema } from "../../../../lib/validation";
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
      return Response.json(
        {
          submission: {
            ...row,
            offer_email: await offerEmailSummary(id),
            photos: row.photos.map((p, i) => ({ index: i, type: p.type })),
          },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const rows =
      await sql`SELECT id,created_at,seller_name,status,jsonb_array_length(cards) AS card_count,notified_at FROM submissions ORDER BY created_at DESC LIMIT 500`;
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
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success)
      return Response.json(
        { error: parsed.error.issues.find(issue => issue.path[0] === "offer")?.message || "Check the status and private notes, then try again." },
        { status: 400 },
      );
    const d = parsed.data;
    const sql = db();
    const [submission] = await sql`SELECT * FROM submissions WHERE id=${d.id}`;
    if (!submission) return Response.json({ error: "Request not found" }, { status: 404 });
    if (d.offer && (!process.env.MAIL_FROM || !process.env.RESEND_API_KEY))
      return Response.json({ error: "Email is not connected. The offer was not changed." }, { status: 503 });
    const payload = d.offer ? offerMessage(submission, d.offer, {
      from: process.env.MAIL_FROM, replyTo: owner(), site: siteUrl(),
    }) : null;
    const [saved] = await sql.query(SAVE_OFFER_SQL, [d.id, d.status, d.notes, d.offer || null, d.offerVersion, randomUUID(), JSON.stringify(payload)]);
    if (!saved) return Response.json({ error: "This request changed or an email is sending. Reopen it before saving again." }, { status: 409 });
    try {
      if (saved.queued_email) await deliverOffer(saved.queued_email);
    } catch {
      // The saved offer and pending email remain recoverable from the inbox.
      console.error("Offer email needs retry");
    }
    return Response.json({ ok: true, saved, offer_email: await offerEmailSummary(d.id) });
  } catch {
    return Response.json(
      { error: "Changes could not be saved." },
      { status: 500 },
    );
  }
}
