import { z } from "zod";
import { purchaseId } from "./purchase-token";
import {
  ACCEPT_PURCHASE_SQL,
  RESPOND_PURCHASE_SQL,
  PURCHASE_OFFER_SQL,
  publicPurchaseOffer,
} from "./purchase-records";
import {
  purchaseReceiptMessage,
  purchaseResponseMessage,
} from "./purchase-receipts";
import {
  purchaseResponseSchema,
  purchaseResponse,
  samePurchaseResponse,
} from "./purchase-response";
const acceptanceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(150)
    .refine(
      (v) => !/[\u0000-\u001f\u007f]/.test(v),
      "Enter your name on one line.",
    ),
  agree: z.literal(true),
  termsVersion: z.string().max(40),
});
const reply = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow, nosnippet",
    },
  });

export function createPurchaseOfferHandler(deps) {
  async function GET(_request, { params }) {
    try {
      const id = purchaseId((await params).token);
      if (!id)
        return reply({ error: "This offer link is not available." }, 404);
      const [row] = await deps.sql.query(PURCHASE_OFFER_SQL, [id]);
      if (!row)
        return reply({ error: "This offer link is not available." }, 404);
      return reply({ offer: publicPurchaseOffer(row) });
    } catch {
      return reply(
        { error: "We could not load this offer. Please try again." },
        503,
      );
    }
  }

  async function POST(request, { params }) {
    if (!deps.sameOrigin(request))
      return reply({ error: "Open your offer link and try again." }, 403);
    if (Number(request.headers.get("content-length")) > 16000)
      return reply({ error: "Please check your name and try again." }, 413);
    try {
      const { token } = await params;
      const id = purchaseId(token);
      if (!id)
        return reply({ error: "This offer link is not available." }, 404);
      if (await deps.limited(request, "purchase-acceptance", 20))
        return reply(
          {
            error:
              "Too many attempts. Please try again later or contact the shop.",
          },
          429,
        );
      let data, raw;
      try {
        raw = await request.json();
        data = (
          raw.action && raw.action !== "accept"
            ? purchaseResponseSchema
            : acceptanceSchema
        ).safeParse(raw);
      } catch {
        return reply({ error: "Check your name and agreement checkbox." }, 400);
      }
      if (!data.success)
        return reply(
          {
            error:
              data.error.issues[0]?.message ||
              "Check your name and response, then try again.",
          },
          400,
        );
      const sql = deps.sql;
      const [row] = await sql.query(PURCHASE_OFFER_SQL, [id]);
      if (!row)
        return reply({ error: "This offer link is not available." }, 404);
      if (raw.action && raw.action !== "accept") {
        let response;
        try {
          response = purchaseResponse(row.purchase_snapshot, data.data);
        } catch (error) {
          return reply({ error: error.message }, 400);
        }
        if (samePurchaseResponse(row, data.data.name, response))
          return reply({ offer: publicPurchaseOffer(row) });
        if (
          row.accepted_at ||
          row.responded_at ||
          !row.can_accept ||
          data.data.termsVersion !== row.purchase_snapshot.terms.version
        )
          return reply(
            {
              error:
                "This version already has a decision or is no longer available. Open the latest offer in your account.",
            },
            409,
          );
        const at = new Date().toISOString(),
          config = deps.mailConfig();
        const payload = purchaseResponseMessage(
          row,
          data.data.name,
          at,
          response,
          { ...config, url: `${config.site}/offer/${token}` },
        );
        const [saved] = await sql.query(RESPOND_PURCHASE_SQL, [
          id,
          data.data.name,
          at,
          JSON.stringify(response),
          JSON.stringify(payload),
        ]);
        if (!saved) {
          const [latest] = await sql.query(PURCHASE_OFFER_SQL, [id]);
          return samePurchaseResponse(latest, data.data.name, response)
            ? reply({ offer: publicPurchaseOffer(latest) })
            : reply(
                {
                  error:
                    "The offer changed before your response was saved. Open the latest version.",
                },
                409,
              );
        }
        try {
          await deps.deliver(id);
        } catch {}
        const [updated] = await sql.query(PURCHASE_OFFER_SQL, [id]);
        return reply({ offer: publicPurchaseOffer(updated) });
      }
      // A repeated click or retry cannot change the signer, record or receipt.
      if (row.accepted_at) return reply({ offer: publicPurchaseOffer(row) });
      if (
        !row.can_accept ||
        data.data.termsVersion !== row.purchase_snapshot.terms.version
      )
        return reply(
          {
            error:
              "This offer is no longer available to accept. Open the latest offer email or contact the shop.",
          },
          409,
        );
      const config = deps.mailConfig();
      if (!config.from || !config.enabled)
        return reply(
          {
            error:
              "We cannot send your confirmation right now. Please contact the shop before accepting.",
          },
          503,
        );
      const acceptedAt = new Date().toISOString();
      const payload = purchaseReceiptMessage(row, data.data.name, acceptedAt, {
        from: config.from,
        replyTo: config.replyTo,
        url: `${config.site}/offer/${token}`,
      });
      const [accepted] = await sql.query(ACCEPT_PURCHASE_SQL, [
        id,
        data.data.name,
        acceptedAt,
        JSON.stringify(payload),
      ]);
      if (!accepted) {
        const [latest] = await sql.query(PURCHASE_OFFER_SQL, [id]);
        if (latest?.accepted_at)
          return reply({ offer: publicPurchaseOffer(latest) });
        return reply(
          {
            error:
              "The offer changed before acceptance. Open the latest offer email or contact the shop.",
          },
          409,
        );
      }
      // Acceptance and its durable receipt are already committed; delivery is separate.
      try {
        await deps.deliver(id);
      } catch {
        console.error("Purchase confirmation needs retry");
      }
      const [saved] = await sql.query(PURCHASE_OFFER_SQL, [id]);
      return reply({ offer: publicPurchaseOffer(saved) });
    } catch {
      return reply(
        {
          error:
            "We could not confirm the result. Reopen this offer to check before trying again.",
        },
        503,
      );
    }
  }

  return { GET, POST };
}
