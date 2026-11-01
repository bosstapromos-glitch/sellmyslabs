import { signedIn } from "../../../../lib/security";
import { db } from "../../../../lib/db";

export async function GET(request) {
  if (!(await signedIn())) return new Response("Unauthorized", { status: 401 });
  const params = new URL(request.url).searchParams;
  const id = params.get("id") || "";
  const photoId = params.get("photo") || "";
  if (
    !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(id) ||
    !/^[a-f\d]{64}$/.test(photoId)
  )
    return new Response("Not found", { status: 404 });
  try {
    const [row] =
      await db()`SELECT offer_photos FROM submissions WHERE id=${id}`;
    const photo = row?.offer_photos.find((photo) => photo.id === photoId);
    if (!photo) return new Response("Not found", { status: 404 });
    return new Response(Buffer.from(photo.content, "base64"), {
      headers: {
        "Content-Type": photo.type,
        "Content-Disposition": `inline; filename="${photo.filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Could not load sales photo", { status: 500 });
  }
}
