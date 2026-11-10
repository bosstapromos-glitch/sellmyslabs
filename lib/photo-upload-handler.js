import { stagePhoto } from "./submission-uploads";
export function createPhotoUploadHandler({
  put,
  del,
  db,
  configured,
  sameOrigin,
  limited,
}) {
  return async function POST(request) {
    if (!sameOrigin(request))
      return Response.json(
        { error: "Please upload from this website." },
        { status: 403 },
      );
    if (!configured())
      return Response.json(
        {
          error:
            "Photo uploads are temporarily unavailable. Please try again shortly.",
        },
        { status: 503 },
      );
    if (Number(request.headers.get("content-length")) > 400000)
      return Response.json(
        { error: "Please choose a smaller photo." },
        { status: 413 },
      );
    try {
      if (await limited(request, "submission-photo", 300))
        return Response.json(
          {
            error:
              "Too many photo uploads. Please try again in an hour or contact our shop.",
          },
          { status: 429 },
        );
      const form = await request.formData();
      if (form.getAll("photo").length !== 1)
        return Response.json(
          { error: "Please upload one photo at a time." },
          { status: 400 },
        );
      const result = await stagePhoto(form.get("id"), form.get("photo"), {
        sql: db(),
        put,
        del,
      });
      return Response.json(result, {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error) {
      const safe =
        /^(Please reload|This photo|Choose a JPG|This request|This draft)/.test(
          error.message || "",
        );
      return Response.json(
        {
          error: safe
            ? error.message
            : "This photo could not upload. Check your connection and choose it again; your other photos are still attached.",
        },
        { status: safe ? 400 : 503 },
      );
    }
  };
}
