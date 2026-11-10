import { db } from "../../../../lib/db";
import { signedIn, sameOrigin, owner } from "../../../../lib/security";
import { siteUrl } from "../../../../lib/origin";
import { createAdminConsignmentHandler } from "../../../../lib/consignment-handler";
import { deliverConsignmentEmail } from "../../../../lib/consignment-mail";
export const maxDuration = 60;
const handle = (request) =>
  createAdminConsignmentHandler({
    sql: db(),
    signedIn,
    sameOrigin,
    deliver: deliverConsignmentEmail,
    mailConfig: () => ({
      from: process.env.MAIL_FROM,
      replyTo: owner(),
      site: siteUrl(),
    }),
  })(request);
export const GET = handle;
export const POST = handle;
