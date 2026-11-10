import { put, del } from "@vercel/blob";
import { db, configured } from "../../../../lib/db";
import { sameOrigin, limited } from "../../../../lib/security";
import { createPhotoUploadHandler } from "../../../../lib/photo-upload-handler";
export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = createPhotoUploadHandler({
  put,
  del,
  db,
  configured,
  sameOrigin,
  limited,
});
