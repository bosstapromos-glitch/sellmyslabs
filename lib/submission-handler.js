import { draftOwner, SUBMIT_ACCOUNT_DRAFT_SQL } from "./account-drafts";
import { submissionSchema } from "./validation";
import { resolveUploads, UploadValidationError } from "./submission-uploads";
function imageType(bytes) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  return null;
}

export function createSubmissionHandler({
  after,
  put,
  del,
  db,
  configured,
  sameOrigin,
  limited,
  notifySubmission,
  getIdentity = async () => null,
}) {
  return async function POST(request) {
    const uploaded = [];
    let saved = false;
    try {
      if (!sameOrigin(request))
        return Response.json(
          { error: "Please submit from this website." },
          { status: 403 },
        );
      if (!configured())
        return Response.json(
          {
            error:
              "Online requests are temporarily unavailable. Please contact our shop.",
          },
          { status: 503 },
        );
      if (Number(request.headers.get("content-length")) > 3500000)
        return Response.json(
          { error: "Please keep photos below 3 MB in total." },
          { status: 413 },
        );
      if (await limited(request, "submission", 8))
        return Response.json(
          {
            error:
              "Too many requests. Please try again in an hour or contact our shop.",
          },
          { status: 429 },
        );
      const form = await request.formData();
      let raw;
      try {
        raw = JSON.parse(form.get("data"));
      } catch {
        return Response.json(
          { error: "Please check your request and try again." },
          { status: 400 },
        );
      }
      const parsed = submissionSchema.safeParse(raw);
      if (!parsed.success)
        return Response.json(
          {
            error:
              parsed.error.issues[0]?.message ||
              "Check your card and contact details.",
          },
          { status: 400 },
        );
      const d = parsed.data;
      const sql = db();
      const ownerId = await draftOwner(d.id, sql);
      let identity;
      if (ownerId) {
        identity = await getIdentity();
        if (!identity?.emails?.length || identity.id !== ownerId)
          return Response.json(
            { error: "Sign in to the account that owns this draft." },
            { status: 403 },
          );
      }
      const exists = await sql`SELECT id FROM submissions WHERE id=${d.id}`;
      if (exists.length)
        return Response.json({
          id: d.id,
          reference: d.id.slice(0, 8).toUpperCase(),
        });
      let submissionPhotos;
      if (form.has("uploads")) {
        if (form.getAll("photos").length)
          return Response.json(
            { error: "Please reload and add your photos again." },
            { status: 400 },
          );
        try {
          submissionPhotos = await resolveUploads(
            d.id,
            JSON.parse(form.get("uploads")),
            sql,
          );
        } catch (error) {
          if (
            !(error instanceof UploadValidationError) &&
            !(error instanceof SyntaxError)
          )
            throw error;
          return Response.json(
            {
              error:
                error instanceof UploadValidationError
                  ? error.message
                  : "Please add your photos again.",
            },
            { status: 400 },
          );
        }
      } else {
        // Preserve requests from tabs opened before the separate-upload release.
        const files = form.getAll("photos");
        if (files.length === 0)
          return Response.json(
            {
              error:
                "Add at least one photo of your items before sending your request.",
            },
            { status: 400 },
          );
        if (files.length > 8)
          return Response.json(
            { error: "You can add up to 8 photos per request." },
            { status: 400 },
          );
        if (files.reduce((a, f) => a + (f.size || 0), 0) > 3000000)
          return Response.json(
            { error: "Please keep photos below 3 MB in total." },
            { status: 413 },
          );
        const checked = [];
        for (const file of files) {
          if (
            !file ||
            typeof file.arrayBuffer !== "function" ||
            file.size > 1500000 ||
            file.size === 0
          )
            return Response.json(
              { error: "Each photo must be a JPG, PNG or WebP under 1.5 MB." },
              { status: 400 },
            );
          const bytes = Buffer.from(await file.arrayBuffer());
          const type = imageType(bytes);
          if (!type)
            return Response.json(
              { error: "Please use JPG, PNG or WebP photos." },
              { status: 400 },
            );
          checked.push({ bytes, type });
        }
        for (const [i, file] of checked.entries()) {
          const blob = await put(`submissions/${d.id}/${i}`, file.bytes, {
            access: "private",
            contentType: file.type,
            addRandomSuffix: true,
          });
          uploaded.push({
            url: blob.url,
            pathname: blob.pathname,
            type: file.type,
          });
        }
        submissionPhotos = uploaded;
      }
      const draftVersion = Number(form.get("draftVersion"));
      if (ownerId && (!Number.isInteger(draftVersion) || draftVersion < 1))
        return Response.json(
          { error: "Open the latest saved draft before sending." },
          { status: 409 },
        );
      const inserted = ownerId
        ? await sql.query(SUBMIT_ACCOUNT_DRAFT_SQL, [
            d.id,
            identity.id,
            draftVersion,
            d.name,
            d.email,
            d.phone,
            d.notes,
            JSON.stringify(d.cards),
            JSON.stringify(submissionPhotos),
            d.askingTotal || null,
            d.saleMethod,
          ])
        : await sql`INSERT INTO submissions(id,seller_name,email,phone,seller_notes,cards,photos,asking_total,sale_method) VALUES(${d.id},${d.name},${d.email},${d.phone},${d.notes},${JSON.stringify(d.cards)}::jsonb,${JSON.stringify(submissionPhotos)}::jsonb,${d.askingTotal || null},${d.saleMethod}) ON CONFLICT(id) DO NOTHING RETURNING id`;
      if (ownerId && !inserted.length)
        return Response.json(
          {
            error:
              "This draft changed on another device. Open the latest saved version before sending.",
          },
          { status: 409 },
        );
      saved = inserted.length > 0;
      if (!saved && uploaded.length) await del(uploaded.map((p) => p.url));
      after(async () => {
        try {
          await notifySubmission(d.id);
        } catch {
          console.error("Submission saved; notification pending retry.");
        }
      });
      return Response.json(
        { id: d.id, reference: d.id.slice(0, 8).toUpperCase() },
        { status: 201 },
      );
    } catch {
      if (!saved && uploaded.length)
        await del(uploaded.map((p) => p.url)).catch(() => {});
      return Response.json(
        {
          error:
            "We could not save your request. Your draft is still here. Please try again.",
        },
        { status: 500 },
      );
    }
  };
}
