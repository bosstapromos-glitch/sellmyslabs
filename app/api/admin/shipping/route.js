import { z } from "zod";
import { signedIn, sameOrigin } from "../../../../lib/security";
import { db } from "../../../../lib/db";
import {
  SHIPMENT_SQL,
  SAVE_PROGRESS_SQL,
  publicShipment,
} from "../../../../lib/shipping";

const idSchema = z.string().uuid();
const progressSchema = z.object({
  id: idSchema,
  action: z.enum(["received", "inspected", "paid"]),
  version: z.number().int().min(0),
  editVersion: z.number().int().min(0),
  at: z.iso
    .datetime()
    .refine(
      (value) => new Date(value).getTime() <= Date.now() + 60000,
      "Use the time this actually happened, not a future date.",
    ),
});
export async function GET(request) {
  if (!(await signedIn()))
    return Response.json({ error: "Please sign in again." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!idSchema.safeParse(id).success)
    return Response.json({ error: "Offer not found." }, { status: 404 });
  try {
    const [row] = await db().query(SHIPMENT_SQL, [id]);
    if (!row?.accepted_at)
      return Response.json(
        { error: "This offer has not been accepted." },
        { status: 404 },
      );
    return Response.json({ shipment: publicShipment(row) });
  } catch {
    return Response.json(
      { error: "Could not load shipping." },
      { status: 503 },
    );
  }
}
export async function POST(request) {
  if (!sameOrigin(request) || !(await signedIn()))
    return Response.json({ error: "Please sign in again." }, { status: 401 });
  if (Number(request.headers.get("content-length")) > 2048)
    return Response.json(
      { error: "Check the progress update." },
      { status: 413 },
    );
  try {
    let data;
    try {
      data = progressSchema.safeParse(await request.json());
    } catch {
      return Response.json(
        { error: "Check the progress update." },
        { status: 400 },
      );
    }
    if (!data.success)
      return Response.json(
        { error: data.error.issues[0].message },
        { status: 400 },
      );
    const { id, action, version, editVersion, at } = data.data;
    const sql = db();
    const [row] = await sql.query(SHIPMENT_SQL, [id]);
    if (!row?.accepted_at || new Date(at) < new Date(row.accepted_at))
      return Response.json(
        { error: "Use a time after the offer was accepted." },
        { status: 400 },
      );
    const [saved] = await sql.query(SAVE_PROGRESS_SQL, [
      id,
      action,
      version,
      at,
      editVersion,
    ]);
    if (!saved)
      return Response.json(
        {
          error:
            "This request changed or that step isn’t ready. Refresh the request before updating progress.",
        },
        { status: 409 },
      );
    const [updated] = await sql.query(SHIPMENT_SQL, [id]);
    return Response.json({
      shipment: publicShipment(updated),
      editVersion: saved.edit_version,
      status: saved.status,
    });
  } catch {
    return Response.json(
      {
        error:
          "Could not confirm the update. Refresh the request to check before trying again.",
      },
      { status: 503 },
    );
  }
}
