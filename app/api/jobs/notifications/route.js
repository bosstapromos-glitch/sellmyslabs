import { del } from "@vercel/blob";
import { cleanupUploads } from "../../../../lib/submission-uploads";
import { db } from "../../../../lib/db";
import { notifySubmission } from "../../../../lib/mail";
import { deliverPurchaseReceipt } from "../../../../lib/purchase-receipts";
export const maxDuration = 60;
export async function GET(request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    await cleanupUploads(sql, del).catch(() =>
      console.error("Photo cleanup will retry."),
    );
  return Response.json({ error: "Unauthorized" }, { status: 401 });
  const sql = db();
  const receipts =
    await sql`SELECT offer_id FROM purchase_receipts WHERE status IN ('pending','failed','sending') AND (locked_until IS NULL OR locked_until<now()) AND (first_attempt_at IS NULL OR first_attempt_at>now()-interval '23 hours') ORDER BY created_at LIMIT 3`;
  await Promise.allSettled(
    receipts.map((row) => deliverPurchaseReceipt(row.offer_id)),
  );
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
  await cleanupUploads(sql, del).catch(() =>
    console.error("Photo cleanup will retry."),
  );
  return Response.json({
    sent,
    pending: rows.length - sent,
    receiptRetries: receipts.length,
  });
}
