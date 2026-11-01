import { createHmac, timingSafeEqual } from "node:crypto";

const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
function signature(id, secret) {
  if (!secret || secret.length < 32)
    throw new Error("Offer links are not configured.");
  // Separate purpose from owner authentication. Only grants access to one offer.
  return createHmac("sha256", secret)
    .update(`purchase-offer:v1:${id}`)
    .digest("base64url");
}
export function purchaseToken(id, secret = process.env.SESSION_SECRET) {
  if (!UUID.test(id)) throw new Error("Invalid offer ID.");
  return `${id}.${signature(id, secret)}`;
}
export function purchaseId(token, secret = process.env.SESSION_SECRET) {
  if (typeof token !== "string" || token.length > 100) return null;
  const [id, supplied, extra] = token.split(".");
  if (
    !UUID.test(id || "") ||
    !/^[A-Za-z0-9_-]{43}$/.test(supplied || "") ||
    extra !== undefined
  )
    return null;
  const expected = signature(id, secret);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    return null;
  return id;
}
export function purchasePath(id) {
  return `/offer/${purchaseToken(id)}`;
}
