import { db } from "../../../../lib/db";
import { notifySubmission } from "../../../../lib/mail";
export const maxDuration = 60;
export async function GET(request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const sql = db();
  const rows =
    await sql`SELECT id FROM submissions WHERE notified_at IS NULL ORDER BY created_at LIMIT 30`;
  let sent = 0;
  for (const row of rows) {
    try {
      await notifySubmission(row.id);
      sent++;
    } catch {
      console.error("Notification retry failed");
    }
  }
  await sql`DELETE FROM login_tokens WHERE expires_at<now()`;
  await sql`DELETE FROM rate_limits WHERE bucket<${Math.floor(Date.now() / 3600000) - 24}`;
  return Response.json({ sent, pending: rows.length - sent });
}
