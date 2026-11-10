import { createHmac, timingSafeEqual } from "node:crypto";
const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
export function consignmentToken(id, secret = process.env.SESSION_SECRET) {
  if (!UUID.test(id) || !secret || secret.length < 32)
    throw Error("Consignment links are not configured.");
  return `${id}.${createHmac("sha256", secret).update(`consignment-offer:v1:${id}`).digest("base64url")}`;
}
export function consignmentId(token, secret = process.env.SESSION_SECRET) {
  if (typeof token !== "string" || token.length > 100) return null;
  const [id, sig, extra] = token.split(".");
  if (
    !UUID.test(id || "") ||
    !/^[A-Za-z0-9_-]{43}$/.test(sig || "") ||
    extra !== undefined
  )
    return null;
  const expected = consignmentToken(id, secret).split(".")[1];
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig)) ? id : null;
}
export const consignmentPath = (id) =>
  `/consignment/offer/${consignmentToken(id)}`;
