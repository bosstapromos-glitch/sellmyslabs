import { db } from "../../../../lib/db";
import { signedIn, sameOrigin, owner } from "../../../../lib/security";
import { siteUrl } from "../../../../lib/origin";
import { createAdminRetakeHandler } from "../../../../lib/photo-retakes";
export const maxDuration = 60;
export const POST = createAdminRetakeHandler({
  sql: db,
  signedIn,
  sameOrigin,
  mailConfig: () => ({
    from: process.env.MAIL_FROM,
    replyTo: owner(),
    site: siteUrl(),
  }),
});
