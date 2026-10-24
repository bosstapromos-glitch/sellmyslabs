import { siteUrl } from './origin';
import { db } from "./db";
import { owner } from "./security";
export async function mail({ subject, text, id }) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM)
    throw new Error("Email is not configured");
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(id ? { "Idempotency-Key": id } : {}),
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [owner()],
      subject,
      text,
    }),
  });
  if (!result.ok)
    throw new Error(`Email delivery was not accepted (${result.status})`);
}
export async function notifySubmission(id) {
  const sql = db();
  const [row] =
    await sql`SELECT id, cards, created_at FROM submissions WHERE id=${id} AND notified_at IS NULL`;
  if (!row) return;
  await mail({
    subject: `New SellMySlabs request · ${id.slice(0, 8).toUpperCase()}`,
    text: `A new request with ${row.cards.length} item entries is ready to review.\n\nOpen your private workspace:\n${siteUrl()}/admin?id=${id}\n\nSeller details and photos are available after sign-in.`,
    id: `submission-${id}`,
  });
  await sql`UPDATE submissions SET notified_at=now() WHERE id=${id}`;
}
