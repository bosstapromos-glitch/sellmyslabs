import { get } from "@vercel/blob";
import { getIdentity } from "../../../../lib/identity";
import { db } from "../../../../lib/db";
import {
  CUSTOMER_PHOTOS_SQL,
  validRequestId,
} from "../../../../lib/customer-records";
export async function GET(request) {
  try {
    const identity = await getIdentity();
    if (!identity) return new Response("Please sign in.", { status: 401 });
    if (!identity.emails.length)
      return new Response("Verify your email first.", { status: 403 });
    const params = new URL(request.url).searchParams;
    const id = params.get("id");
    const rawIndex = params.get("index");
    if (
      !validRequestId(id) ||
      !/^\d{1,2}$/.test(rawIndex || "") ||
      Number(rawIndex) >= 100
    )
      return new Response("Not found", { status: 404 });
    const [row] = await db().query(CUSTOMER_PHOTOS_SQL, [identity.id, id]);
    const photo = row?.photos?.[Number(rawIndex)];
    if (
      !photo?.pathname?.startsWith(`submissions/${id}/`) ||
      !["image/jpeg", "image/png", "image/webp"].includes(photo.type)
    )
      return new Response("Not found", { status: 404 });
    const result = await get(photo.pathname, { access: "private" });
    if (!result || result.statusCode !== 200)
      return new Response("Not found", { status: 404 });
    return new Response(result.stream, {
      headers: {
        "Content-Type": photo.type,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Could not load this photo. Please try again.", {
      status: 503,
    });
  }
}
