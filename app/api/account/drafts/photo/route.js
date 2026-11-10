import { get } from "@vercel/blob";
import { getIdentity } from "../../../../../lib/identity";
import { db } from "../../../../../lib/db";
import {
  accountDraftPhoto,
  DraftError,
} from "../../../../../lib/account-drafts";
export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const raw = params.get("photo");
    if (!/^[a-f\d]{64}$/.test(raw || ""))
      return new Response("Not found", { status: 404 });
    const photo = await accountDraftPhoto(
      await getIdentity(),
      params.get("id"),
      raw,
      db(),
    );
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
  } catch (e) {
    return new Response("Photo unavailable", {
      status: e instanceof DraftError ? e.status : 404,
    });
  }
}
