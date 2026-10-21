import { get } from "@vercel/blob";
import { db } from "../../../../lib/db";
import { signedIn } from "../../../../lib/security";
export async function GET(request) {
  if (!(await signedIn())) return new Response("Unauthorized", { status: 401 });
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  const index = Number(params.get("index"));
  if (
    !/^[a-f\d-]{36}$/i.test(id || "") ||
    !Number.isInteger(index) ||
    index < 0
  )
    return new Response("Not found", { status: 404 });
  try {
    const sql = db();
    const [row] = await sql`SELECT photos FROM submissions WHERE id=${id}`;
    const photo = row?.photos[index];
    if (!photo) return new Response("Not found", { status: 404 });
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
    return new Response("Could not load photo", { status: 500 });
  }
}
