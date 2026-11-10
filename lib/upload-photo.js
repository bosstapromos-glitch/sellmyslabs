import { preparePhoto, photoPreview } from "./prepare-photo";
import { requestJSON } from "./request-json";

// The returned object deliberately contains no original or full-size photo File.
export async function uploadPhoto(
  file,
  id,
  { prepare = preparePhoto, preview = photoPreview, send = requestJSON } = {},
) {
  const compressed = await prepare(file);
  const body = new FormData();
  body.set("id", id);
  body.set("photo", compressed);
  const result = await send(
    "/api/submissions/photos",
    { method: "POST", body },
    "This photo could not upload. Choose it again to retry.",
  );
  if (typeof result.token !== "string" || !/^[a-f\d]{64}$/.test(result.token))
    throw Error("This photo could not upload. Choose it again to retry.");
  return {
    token: result.token,
    name: file.name,
    preview: preview(compressed),
    // A response from the previous release has a seven-day receipt lifetime.
    expiresAt: Number.isFinite(result.expiresAt)
      ? result.expiresAt
      : Date.now() + 7 * 86400000,
  };
}
