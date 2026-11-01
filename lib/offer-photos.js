import { createHash } from "node:crypto";

export const MAX_OFFER_PHOTOS = 3;
export const MAX_OFFER_PHOTO_BYTES = 350000;

export const offerPhotoSummary = (photos = []) =>
  photos.map(({ id, filename, type }) => ({ id, filename, type }));

function imageType(bytes) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return { type: "image/jpeg", extension: "jpg" };
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { type: "image/png", extension: "png" };
  if (
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  )
    return { type: "image/webp", extension: "webp" };
  return null;
}

export async function prepareOfferPhotos(existing = [], keepIds, files = []) {
  const retained = keepIds ?? existing.map((photo) => photo.id);
  if (retained.length + files.length > MAX_OFFER_PHOTOS)
    throw Error("Attach up to 3 sales photos to an offer.");
  if (
    new Set(retained).size !== retained.length ||
    retained.some((id) => !existing.some((photo) => photo.id === id))
  )
    throw Error(
      "These sales photos have changed. Reload the request and try again.",
    );
  const photos = retained.map((id) =>
    existing.find((photo) => photo.id === id),
  );
  for (const file of files) {
    if (
      typeof file?.arrayBuffer !== "function" ||
      !file.size ||
      file.size > MAX_OFFER_PHOTO_BYTES
    )
      throw Error("A sales photo is too large. Remove it and choose it again.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const format = imageType(bytes);
    if (!format) throw Error("Choose a JPG, PNG or WebP sales photo.");
    const id = createHash("sha256").update(bytes).digest("hex");
    if (!photos.some((photo) => photo.id === id))
      photos.push({
        id,
        filename: `recent-sale-${id.slice(0, 8)}.${format.extension}`,
        type: format.type,
        content: bytes.toString("base64"),
      });
  }
  return photos;
}
