import { randomUUID } from "node:crypto";
import { db } from "./db";
import { CLAIM_PURCHASE_RECEIPT_SQL } from "./purchase-records";
import { purchaseRecordText, money } from "./purchase-terms";

export function purchaseReceiptMessage(
  row,
  name,
  acceptedAt,
  { from, replyTo, url },
) {
  const to = row.recipients;
  if (!Array.isArray(to) || to.length !== 1 || typeof to[0] !== "string")
    throw new Error("Offer recipient is missing.");
  const snapshot = row.purchase_snapshot;
  return {
    from,
    to,
    reply_to: replyTo,
    ...(to[0].toLowerCase() === replyTo.toLowerCase()
      ? {}
      : { bcc: [replyTo] }),
    subject: `Offer accepted · ${money(snapshot.amount)} · ${snapshot.reference}`,
    text: `Your acceptance has been recorded.\n\nAccepted by: ${name}\nAccepted at: ${acceptedAt} (UTC)\n\n${purchaseRecordText(snapshot)}\n\nView or print your record:\n${url}\n\nBefore shipping, contact the shop to confirm shipping details.\n${snapshot.buyer.phone}\n${snapshot.buyer.email}\n\nThank you,\nJT\nSellMySlabs`,
  };
}

export async function deliverPurchaseReceipt(
  id,
  { sql = db(), fetchEmail = fetch } = {},
) {
  const lease = randomUUID();
  const [receipt] = await sql.query(CLAIM_PURCHASE_RECEIPT_SQL, [id, lease]);
  if (!receipt) return;
  try {
    if (!process.env.RESEND_API_KEY)
      throw new Error("Email is not configured.");
    const response = await fetchEmail("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `purchase-acceptance-${id}`,
      },
      body: JSON.stringify(receipt.payload),
    });
    const result = await response.json();
    if (!response.ok || !result.id) throw new Error("Email was not accepted.");
    await sql`UPDATE purchase_receipts SET status='sent',sent_at=now(),provider_id=${result.id},locked_until=NULL,error=NULL WHERE offer_id=${id} AND lease_id=${lease}`;
  } catch {
    await sql`UPDATE purchase_receipts SET status='failed',locked_until=NULL,error='The confirmation email has not been confirmed. The seller’s decision is saved.' WHERE offer_id=${id} AND lease_id=${lease}`;
  }
}

export function purchaseResponseMessage(
  row,
  name,
  at,
  response,
  { from, replyTo, url },
) {
  const to = row.recipients;
  if (!Array.isArray(to) || to.length !== 1 || typeof to[0] !== "string")
    throw Error("Offer recipient is missing.");
  const s = row.purchase_snapshot;
  return {
    from,
    to,
    reply_to: replyTo,
    ...(to[0].toLowerCase() === replyTo.toLowerCase()
      ? {}
      : { bcc: [replyTo] }),
    subject: `${response.action === "counter" ? "Counteroffer sent" : "Offer declined"} · ${s.reference}`,
    text: `Your response is saved in the SellMySlabs portal.\n\nFrom: ${name}\nRecorded at: ${at} (UTC)\nOriginal total offer: ${money(s.amount)}\n${response.action === "counter" ? `Proposed total for the same listed collection: ${money(response.amount)}` : "You declined this offer."}\n${response.note ? `\nYour note:\n${response.note}\n` : ""}\nThis response does not accept or authorize a purchase. Do not ship until you accept an offer and confirm shipping details with the shop. Any revised offer will appear in your account for review.\n\nView your response and the original offer:\n${url}\n\nKeep this link private.\n\nSellMySlabs\n${s.buyer.phone}`,
  };
}
