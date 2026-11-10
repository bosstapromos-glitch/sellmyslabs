import { db } from "../../../../lib/db";
import { owner, sameOrigin, limited } from "../../../../lib/security";
import { siteUrl } from "../../../../lib/origin";
import { deliverPurchaseReceipt } from "../../../../lib/purchase-receipts";
import { createPurchaseOfferHandler } from "../../../../lib/purchase-handler";
export const maxDuration = 60;
function handler() {
  return createPurchaseOfferHandler({
    get sql() {
      return db();
    },
    sameOrigin,
    limited,
    deliver: deliverPurchaseReceipt,
    mailConfig: () => ({
      from: process.env.MAIL_FROM,
      replyTo: owner(),
      site: siteUrl(),
      enabled: !!process.env.RESEND_API_KEY,
    }),
  });
}
export async function GET(request, context) {
  return handler().GET(request, context);
}
export async function POST(request, context) {
  return handler().POST(request, context);
}
