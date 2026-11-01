import { z } from "zod";
import { db } from "../../../../lib/db";
import { owner, sameOrigin, limited } from "../../../../lib/security";
import { siteUrl } from "../../../../lib/origin";
import { purchaseId } from "../../../../lib/purchase-token";
import {
  ACCEPT_PURCHASE_SQL,
  PURCHASE_OFFER_SQL,
  publicPurchaseOffer,
} from "../../../../lib/purchase-records";
import {
  purchaseReceiptMessage,
  deliverPurchaseReceipt,
} from "../../../../lib/purchase-receipts";

export const maxDuration = 60;
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

export async function GET(_request, { params }) {
  try {
    const id = purchaseId((await params).token);
    if (!id) return reply({ error: "This offer link is not available." }, 404);
    const [row] = await db().query(PURCHASE_OFFER_SQL, [id]);
    if (!row) return reply({ error: "This offer link is not available." }, 404);
    return reply({ offer: publicPurchaseOffer(row) });
  } catch {
    return reply(
      { error: "We could not load this offer. Please try again." },
      503,
    );
  }
}

export async function POST(request, { params }) {
  if (!sameOrigin(request))
    return reply({ error: "Open your offer link and try again." }, 403);
  if (Number(request.headers.get("content-length")) > 4096)
    return reply({ error: "Please check your name and try again." }, 413);
  try {
    const { token } = await params;
    const id = purchaseId(token);
    if (!id) return reply({ error: "This offer link is not available." }, 404);
    if (await limited(request, "purchase-acceptance", 20))
      return reply(
        {
          error:
            "Too many attempts. Please try again later or contact the shop.",
        },
        429,
      );
    let data;
    try {
      data = acceptanceSchema.safeParse(await request.json());
    } catch {
      return reply({ error: "Check your name and agreement checkbox." }, 400);
    }
    if (!data.success)
      return reply(
        {
          error:
            "Enter your full name and agree to the listed offer and Purchase Terms.",
        },
        400,
      );
    const sql = db();
    const [row] = await sql.query(PURCHASE_OFFER_SQL, [id]);
    if (!row) return reply({ error: "This offer link is not available." }, 404);
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
    if (!process.env.MAIL_FROM || !process.env.RESEND_API_KEY)
      return reply(
        {
          error:
            "We cannot send your confirmation right now. Please contact the shop before accepting.",
        },
        503,
      );
    const acceptedAt = new Date().toISOString();
    const payload = purchaseReceiptMessage(row, data.data.name, acceptedAt, {
      from: process.env.MAIL_FROM,
      replyTo: owner(),
      url: `${siteUrl()}/offer/${token}`,
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
      await deliverPurchaseReceipt(id);
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
