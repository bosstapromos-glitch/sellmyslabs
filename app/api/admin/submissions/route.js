import { db } from "../../../../lib/db";
import { signedIn, sameOrigin } from "../../../../lib/security";
import { updateSchema } from "../../../../lib/validation";
export async function GET(request) {
  if (!(await signedIn()))
    return Response.json(
      { error: "Sign in to view submissions." },
      { status: 401 },
    );
  try {
    const sql = db();
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      if (!/^[a-f\d-]{36}$/i.test(id))
        return Response.json({ error: "Invalid ID" }, { status: 400 });
      const [row] = await sql`SELECT * FROM submissions WHERE id=${id}`;
      if (!row)
        return Response.json({ error: "Request not found" }, { status: 404 });
      return Response.json(
        {
          submission: {
            ...row,
            photos: row.photos.map((p, i) => ({ index: i, type: p.type })),
          },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const rows =
      await sql`SELECT id,created_at,seller_name,status,jsonb_array_length(cards) AS card_count,notified_at FROM submissions ORDER BY created_at DESC LIMIT 500`;
    return Response.json(
      { submissions: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Could not load requests." },
      { status: 500 },
    );
  }
}
export async function PATCH(request) {
  if (!sameOrigin(request) || !(await signedIn()))
    return Response.json({ error: "Please sign in again." }, { status: 401 });
  try {
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success)
      return Response.json(
        { error: "Check the status, offer and notes." },
        { status: 400 },
      );
    const d = parsed.data;
    const sql = db();
    const rows =
      await sql`UPDATE submissions SET status=${d.status},internal_notes=${d.notes},offer=${d.offer || null},updated_at=now() WHERE id=${d.id} RETURNING id`;
    if (!rows.length)
      return Response.json({ error: "Request not found" }, { status: 404 });
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Changes could not be saved." },
      { status: 500 },
    );
  }
}
