import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  consignmentPublishSchema,
  consignmentSnapshot,
  remainingConsignmentQuantities,
} from "./consignment-offer";
import {
  PUBLISH_CONSIGNMENT_SQL,
  CONSIGNMENT_OFFER_SQL,
  ACCEPT_CONSIGNMENT_SQL,
  publicConsignmentOffer,
} from "./consignment-records";
import { consignmentMessage } from "./consignment-mail";
import { consignmentId, consignmentPath } from "./consignment-token";
const uuid = z.string().uuid();
const reply = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow, nosnippet",
    },
  });
export async function consignmentHistory(sql, id) {
  return sql`SELECT o.*,
 (CASE WHEN o.kind='arrangement' THEN s.consignment_arrangement_id ELSE s.consignment_offer_id END=o.id) AS is_current,
 coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'status',e.status,'sentAt',e.sent_at,'canRetry',e.status IN ('pending','failed','sending') AND (e.locked_until IS NULL OR e.locked_until<now()) AND (e.first_attempt_at IS NULL OR e.first_attempt_at>now()-interval '23 hours'))) FROM consignment_emails e WHERE e.offer_id=o.id),'[]'::jsonb) AS emails
 FROM consignment_offers o JOIN submissions s ON s.id=o.submission_id WHERE o.submission_id=${id} ORDER BY o.created_at DESC,o.id DESC`;
}
export function createAdminConsignmentHandler(deps) {
  return async (request) => {
    if (
      !(await deps.signedIn()) ||
      (request.method !== "GET" && !deps.sameOrigin(request))
    )
      return reply({ error: "Please sign in again." }, 401);
    try {
      const sql = deps.sql;
      if (request.method === "GET") {
        const id = new URL(request.url).searchParams.get("id");
        if (!uuid.safeParse(id).success)
          return reply({ error: "Invalid request." }, 400);
        const [s] = await sql`SELECT * FROM submissions WHERE id=${id}`;
        if (!s || s.sale_method !== "consignment")
          return reply({ error: "Consignment request not found." }, 404);
        const offers = await consignmentHistory(sql, id);
        return reply({
          offers: offers.map((o) => ({ ...o, url: consignmentPath(o.id) })),
          remaining: remainingConsignmentQuantities(s.cards, offers),
          arrangementId: s.consignment_arrangement_id,
          offerId: s.consignment_offer_id,
          editVersion: s.edit_version,
        });
      }
      if (Number(request.headers.get("content-length")) > 64000)
        return reply({ error: "This offer is too large." }, 413);
      let raw;
      try {
        raw = await request.json();
      } catch {
        return reply({ error: "Check the offer and try again." }, 400);
      }
      if (raw.action === "retry") {
        if (
          !uuid.safeParse(raw.id).success ||
          !uuid.safeParse(raw.emailId).success
        )
          return reply({ error: "Invalid email record." }, 400);
        const [email] =
          await sql`SELECT e.id FROM consignment_emails e JOIN consignment_offers o ON o.id=e.offer_id WHERE e.id=${raw.emailId} AND o.submission_id=${raw.id}`;
        if (!email) return reply({ error: "Email record not found." }, 404);
        await deps.deliver(email.id);
        return reply({ ok: true });
      }
      const parsed = consignmentPublishSchema.safeParse(raw);
      if (!parsed.success)
        return reply(
          {
            error: parsed.error.issues[0]?.message || "Check the offer fields.",
          },
          400,
        );
      const d = parsed.data;
      const [submission] =
        await sql`SELECT * FROM submissions WHERE id=${d.id}`;
      if (!submission || submission.sale_method !== "consignment")
        return reply({ error: "Consignment request not found." }, 404);
      const history = await consignmentHistory(sql, d.id);
      if (
        d.kind === "sale" &&
        !history.some(
          (o) =>
            o.id === submission.consignment_arrangement_id && o.accepted_at,
        )
      )
        return reply(
          {
            error:
              "The seller must accept the current consignment arrangement first.",
          },
          409,
        );
      let snapshot;
      try {
        snapshot = consignmentSnapshot(
          submission,
          d,
          remainingConsignmentQuantities(submission.cards, history),
        );
      } catch (error) {
        return reply({ error: error.message }, 400);
      }
      const offerId = randomUUID(),
        emailId = randomUUID(),
        config = deps.mailConfig();
      if (!config.from || !config.replyTo)
        return reply(
          { error: "Email is not connected. Nothing was sent." },
          503,
        );
      const payload = consignmentMessage(snapshot, submission.email, {
        ...config,
        url: config.site + consignmentPath(offerId),
      });
      const [saved] = await sql.query(PUBLISH_CONSIGNMENT_SQL, [
        d.id,
        d.editVersion,
        offerId,
        d.kind,
        JSON.stringify(snapshot),
        emailId,
        JSON.stringify(payload),
      ]);
      if (!saved)
        return reply(
          {
            error:
              "This request changed or is closed. Reopen it before sending.",
          },
          409,
        );
      try {
        await deps.deliver(emailId);
      } catch {
        /* Durable notification can be retried. */
      }
      return reply(
        {
          ok: true,
          id: offerId,
          editVersion: saved.edit_version,
          status: saved.status,
        },
        201,
      );
    } catch {
      return reply(
        {
          error:
            "Could not complete this request. Reopen it to check before trying again.",
        },
        503,
      );
    }
  };
}
const acceptance = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(150)
    .refine((v) => !/[\u0000-\u001f\u007f]/.test(v)),
  agree: z.literal(true),
  termsVersion: z.string().max(64),
});
export function createConsignmentAcceptanceHandler(deps) {
  return async (request, { params }) => {
    if (request.method !== "GET" && !deps.sameOrigin(request))
      return reply({ error: "Open the offer link and try again." }, 403);
    try {
      const { token } = await params;
      const id = consignmentId(token);
      if (!id) return reply({ error: "This link is not available." }, 404);
      const sql = deps.sql;
      const [row] = await sql.query(CONSIGNMENT_OFFER_SQL, [id]);
      if (!row) return reply({ error: "This link is not available." }, 404);
      if (request.method === "GET")
        return reply({ offer: publicConsignmentOffer(row) });
      if (Number(request.headers.get("content-length")) > 4096)
        return reply({ error: "Check your name and try again." }, 413);
      if (await deps.limited(request, "consignment-acceptance", 20))
        return reply(
          { error: "Too many attempts. Please try again later." },
          429,
        );
      let data;
      try {
        data = acceptance.safeParse(await request.json());
      } catch {
        return reply(
          { error: "Enter your name and check the agreement box." },
          400,
        );
      }
      if (!data.success)
        return reply(
          {
            error:
              "Enter your full name and agree to the listed arrangement or buyer offer.",
          },
          400,
        );
      if (row.accepted_at) return reply({ offer: publicConsignmentOffer(row) });
      if (
        !row.can_accept ||
        data.data.termsVersion !== row.snapshot.terms.version
      )
        return reply(
          {
            error:
              "This version is no longer available. Open the latest version in your account.",
          },
          409,
        );
      const at = new Date().toISOString(),
        emailId = randomUUID(),
        config = deps.mailConfig();
      const payload = consignmentMessage(
        row.snapshot,
        row.email,
        { ...config, url: config.site + consignmentPath(id) },
        { name: data.data.name, at },
      );
      const [saved] = await sql.query(ACCEPT_CONSIGNMENT_SQL, [
        id,
        data.data.name,
        at,
        emailId,
        JSON.stringify(payload),
      ]);
      if (!saved) {
        const [latest] = await sql.query(CONSIGNMENT_OFFER_SQL, [id]);
        return latest?.accepted_at
          ? reply({ offer: publicConsignmentOffer(latest) })
          : reply(
              {
                error:
                  "This offer changed before acceptance. Open the latest version.",
              },
              409,
            );
      }
      try {
        await deps.deliver(emailId);
      } catch {
        /* Acceptance remains committed. */
      }
      const [accepted] = await sql.query(CONSIGNMENT_OFFER_SQL, [id]);
      return reply({ offer: publicConsignmentOffer(accepted) });
    } catch {
      return reply(
        {
          error:
            "We could not confirm the result. Reopen this link to check before trying again.",
        },
        503,
      );
    }
  };
}
