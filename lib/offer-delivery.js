import { randomUUID } from "node:crypto";
import { db } from "./db";
import { CLAIM_OFFER_SQL, OFFER_SUMMARY_SQL } from "./offer-records";
import { emailDeliveryStatus } from "./email-status";
import { purchasePath } from "./purchase-token";
export async function offerEmailSummary(submissionId) {
  const [row] = await db().query(OFFER_SUMMARY_SQL, [submissionId]);
  if (!row) return null;
  const { provider_id, ...summary } = row;
  let acceptance = null;
  if (row.has_purchase_terms) {
    const [receipt] = await db()`SELECT status,sent_at,
      (status IN ('pending','failed','sending') AND (locked_until IS NULL OR locked_until<now()) AND (first_attempt_at IS NULL OR first_attempt_at>now()-interval '23 hours')) AS can_retry
      FROM purchase_receipts WHERE offer_id=${row.id}`;
    acceptance = {
      url: purchasePath(row.id),
      accepted_at: row.accepted_at,
      accepted_name: row.accepted_name,
      receipt: receipt || null,
    };
  }
  return {
    ...summary,
    acceptance,
    delivery:
      row.status === "sent" ? await emailDeliveryStatus(provider_id) : null,
  };
}
export async function deliverOffer(
  emailId,
  { sql = db(), fetchEmail = fetch } = {},
) {
  const lease = randomUUID();
  const [email] = await sql.query(CLAIM_OFFER_SQL, [emailId, lease]);
  if (!email) return;
  try {
    if (!process.env.RESEND_API_KEY) throw Error("Email is not configured");
    const response = await fetchEmail("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `offer-${email.id}`,
      },
      body: JSON.stringify(email.payload),
    });
    const result = await response.json();
    if (!response.ok || !result.id) throw Error("Email was not accepted");
    await sql`UPDATE offer_emails SET status='sent',sent_at=now(),provider_id=${result.id},locked_until=NULL,error=NULL WHERE id=${email.id} AND lease_id=${lease}`;
  } catch {
    // Keep the same payload and idempotency key on retry. Never retry after
    // Resend's 24-hour deduplication window, when delivery could be uncertain.
    await sql`UPDATE offer_emails SET status='failed',locked_until=NULL,error='Email could not be confirmed. Retry the email or contact the seller directly.' WHERE id=${email.id} AND lease_id=${lease}`;
  }
}
