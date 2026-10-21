import {
  createHmac,
  randomBytes,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
const COOKIE = "sms_owner";
export function owner() {
  const v = process.env.OWNER_EMAIL;
  if (!v) throw new Error("Owner is not configured");
  return v.toLowerCase();
}
function secret() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
    throw new Error("Session secret is not configured");
  return process.env.SESSION_SECRET;
}
export function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
export function randomToken() {
  return randomBytes(32).toString("hex");
}
function sign(v) {
  return createHmac("sha256", secret()).update(v).digest("base64url");
}
export async function signedIn() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  try {
    const [payload, sig] = raw.split(".");
    const expected = sign(payload);
    if (
      !sig ||
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    )
      return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.email === owner() && data.exp > Date.now();
  } catch {
    return false;
  }
}
export async function setSession() {
  const payload = Buffer.from(
    JSON.stringify({ email: owner(), exp: Date.now() + 12 * 60 * 60 * 1000 }),
  ).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 43200,
  });
}
export async function clearSession() {
  (await cookies()).delete(COOKIE);
}
export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}
export async function limited(request, kind, max = 5) {
  const ip =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown";
  const key = createHmac("sha256", secret())
    .update(kind + ":" + ip)
    .digest("hex");
  const bucket = Math.floor(Date.now() / 3600000);
  const sql = db();
  const [row] =
    await sql`INSERT INTO rate_limits(key,bucket) VALUES(${key},${bucket}) ON CONFLICT(key,bucket) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits`;
  return row.hits > max;
}
