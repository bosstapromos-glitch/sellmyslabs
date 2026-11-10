import { after } from "next/server";
import { put, del } from "@vercel/blob";
import { db, configured } from "../../../lib/db";
import { sameOrigin, limited } from "../../../lib/security";
import { notifySubmission } from "../../../lib/mail";
import { createSubmissionHandler } from "../../../lib/submission-handler";
export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = createSubmissionHandler({
  after,
  put,
  del,
  db,
  configured,
  sameOrigin,
  limited,
  notifySubmission,
});
