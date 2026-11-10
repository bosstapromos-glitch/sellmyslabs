import { consignmentResponseText, responseLabel } from "./consignment-response";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { CLAIM_CONSIGNMENT_EMAIL_SQL } from "./consignment-records";
import { consignmentRecordText } from "./consignment-offer";
export function consignmentMessage(
  snapshot,
  email,
  { from, replyTo, url },
  acceptance,
) {
  const label =
    snapshot.kind === "arrangement"
      ? "consignment arrangement"
      : "consignment buyer offer";
  return {
    from,
    to: [email],
    reply_to: replyTo,
    ...(email.toLowerCase() !== replyTo.toLowerCase()
      ? { bcc: [replyTo] }
      : {}),
    subject: `${acceptance ? "Accepted" : "Review your"} ${label} · ${snapshot.reference}`,
    text: `Hi ${snapshot.sellerName},\n\n${acceptance ? `Your acceptance is saved.\nAccepted by: ${acceptance.name}\nAccepted at: ${acceptance.at} (UTC)` : `Your ${label} is ready. Review the details and respond in your SellMySlabs portal using this private link. You can also find it in your account.`}\n\n${url}\n\n${consignmentRecordText(snapshot)}\n\n${acceptance ? "Keep this link to view or print your acceptance record." : "You can accept, decline, or send a counteroffer or change request in the portal."} Keep this link private.\n\nThank you,\nJT\nSellMySlabs\n${snapshot.shop.phone}`,
  };
}
export async function deliverConsignmentEmail(
  id,
  { sql = db(), fetchEmail = fetch } = {},
) {
  const lease = randomUUID();
  const [email] = await sql.query(CLAIM_CONSIGNMENT_EMAIL_SQL, [id, lease]);
  if (!email) return;
  try {
    if (!process.env.RESEND_API_KEY) throw Error("Email not connected");
    const response = await fetchEmail("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `consignment-${id}`,
      },
      body: JSON.stringify(email.payload),
    });
    const data = await response.json();
    if (!response.ok || !data.id) throw Error("Email not confirmed");
    await sql`UPDATE consignment_emails SET status='sent',sent_at=now(),provider_id=${data.id},locked_until=NULL,error=NULL WHERE id=${id} AND lease_id=${lease}`;
  } catch {
    await sql`UPDATE consignment_emails SET status='failed',locked_until=NULL,error='Email was not confirmed. The portal record is saved.' WHERE id=${id} AND lease_id=${lease}`;
  }
}

export function consignmentResponseMessage(
  snapshot,
  email,
  { from, replyTo, url },
  response,
  name,
  at,
) {
  return {
    from,
    to: [email],
    reply_to: replyTo,
    ...(email.toLowerCase() !== replyTo.toLowerCase()
      ? { bcc: [replyTo] }
      : {}),
    subject: `${responseLabel(response.action)} · Consignment · ${snapshot.reference}`,
    text: `Your response is saved in the SellMySlabs portal.\n\nFrom: ${name}\nRecorded at: ${at} (UTC)\n\n${consignmentResponseText(response)}\n\nView your response and the original offer:\n${url}\n\nKeep this link private. A revised offer will appear in your account if the shop sends one.\n\nSellMySlabs\n${snapshot.shop.phone}`,
  };
}
