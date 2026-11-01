import { db } from "../../../../../lib/db";
import { sameOrigin, limited } from "../../../../../lib/security";
import { purchaseId } from "../../../../../lib/purchase-token";
import {
  SHIPMENT_SQL,
  SAVE_TRACKING_SQL,
  publicShipment,
  trackingSchema,
} from "../../../../../lib/shipping";

const reply = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow, nosnippet",
    },
  });
export async function GET(_request, { params }) {
  try {
    const id = purchaseId((await params).token);
    if (!id) return reply({ error: "This offer link isn’t available." }, 404);
    const [row] = await db().query(SHIPMENT_SQL, [id]);
    if (!row?.accepted_at || !row.is_current)
      return reply(
        { error: "Open your current accepted offer to view shipping." },
        404,
      );
    return reply({ shipment: publicShipment(row) });
  } catch {
    return reply(
      { error: "We couldn’t load shipping. Please try again." },
      503,
    );
  }
}
export async function POST(request, { params }) {
  if (!sameOrigin(request))
    return reply({ error: "Open your offer link and try again." }, 403);
  if (Number(request.headers.get("content-length")) > 2048)
    return reply(
      { error: "Enter just your carrier and tracking number." },
      413,
    );
  try {
    const id = purchaseId((await params).token);
    if (!id) return reply({ error: "This offer link isn’t available." }, 404);
    if (await limited(request, "purchase-tracking", 30))
      return reply(
        { error: "Too many attempts. Please try again later." },
        429,
      );
    let data;
    try {
      data = trackingSchema.safeParse(await request.json());
    } catch {
      return reply({ error: "Check your shipping details." }, 400);
    }
    if (!data.success)
      return reply({ error: data.error.issues[0].message }, 400);
    const sql = db();
    const [saved] = await sql.query(SAVE_TRACKING_SQL, [
      id,
      data.data.carrier,
      data.data.tracking,
      data.data.version,
    ]);
    if (!saved)
      return reply(
        {
          error:
            "This request changed or shipping is no longer editable. Refresh the progress before trying again.",
        },
        409,
      );
    const [row] = await sql.query(SHIPMENT_SQL, [id]);
    return reply({ shipment: publicShipment(row) });
  } catch {
    return reply(
      {
        error:
          "We couldn’t confirm the update. Refresh progress to check before trying again.",
      },
      503,
    );
  }
}
