import { db } from "../../../../lib/db";
import { sameOrigin, owner, limited } from "../../../../lib/security";
import { siteUrl } from "../../../../lib/origin";
import { createConsignmentAcceptanceHandler } from "../../../../lib/consignment-handler";
import { deliverConsignmentEmail } from "../../../../lib/consignment-mail";
export const maxDuration = 60;
const handle = (request, context) =>
  createConsignmentAcceptanceHandler({
    sql: db(),
    sameOrigin,
    limited,
    deliver: deliverConsignmentEmail,
    mailConfig: () => ({
      from: process.env.MAIL_FROM,
      replyTo: owner(),
      site: siteUrl(),
    }),
  })(request, context);
export const GET = handle;
export const POST = handle;
