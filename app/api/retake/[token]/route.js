import { put, del } from "@vercel/blob";
import { db, configured } from "../../../../lib/db";
import { sameOrigin, limited } from "../../../../lib/security";
import { createRetakeUploadHandler } from "../../../../lib/photo-retakes";
export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = createRetakeUploadHandler({
  sql: db,
  put,
  del,
  configured,
  sameOrigin,
  limited,
});
