import { signedIn, sameOrigin } from "../../../../lib/security";
import { db } from "../../../../lib/db";
import { deliverPurchaseReceipt } from "../../../../lib/purchase-receipts";
import { offerEmailSummary } from "../../../../lib/offer-delivery";
export const maxDuration = 60;
export async function POST(request) {
  if (!sameOrigin(request) || !(await signedIn()))
    return Response.json({ error: "Please sign in again." }, { status: 401 });
  try {
    const { id } = await request.json();
    if (typeof id !== "string" || !/^[a-f\d-]{36}$/i.test(id))
      return Response.json({ error: "Invalid offer." }, { status: 400 });
    const [row] =
      await db()`SELECT submission_id FROM offer_emails WHERE id=${id} AND accepted_at IS NOT NULL`;
    if (!row)
      return Response.json({ error: "Acceptance not found." }, { status: 404 });
    await deliverPurchaseReceipt(id);
    return Response.json({
      offer_email: await offerEmailSummary(row.submission_id),
    });
  } catch {
    return Response.json(
      {
        error:
          "The confirmation could not be checked. The acceptance record is still saved.",
      },
      { status: 503 },
    );
  }
}
