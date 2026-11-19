import { PHOTO_MAX_EDGE, MAX_PHOTO_BYTES } from "./photo-selection";
import { analysisSize, photoMetrics, assessPhoto } from "./photo-quality";

// Only compressed Files and small thumbnails survive preparation, never canvases.
const previews = new WeakMap();
const warnings = new WeakMap();
export const photoWarnings = (file) => warnings.get(file) || [];

// A photo that cannot be analysed (an old browser, a blocked canvas) is still
// accepted: the check must never be the reason a seller cannot send a request.
function assess(bitmap, canvas, context) {
  try {
    const { width, height } = analysisSize(bitmap.width, bitmap.height);
    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height);
    return assessPhoto(
      photoMetrics({ data: pixels.data, width, height }),
      bitmap,
    );
  } catch {
    return { reject: null, warnings: [] };
  }
}
let processing = Promise.resolve();
export const photoPreview = (file) => previews.get(file) || file;

// Serialize across callers as well as within a selection, including rapid camera taps.
export function preparePhoto(file) {
  const next = processing.then(() => optimizePhoto(file));
  processing = next.catch(() => {});
  return next;
}

function decodeHeic(file) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./heic-worker.js", import.meta.url));
    const finish = (error, bitmap) => {
      clearTimeout(timer);
      worker.terminate();
      if (error) reject(error);
      else resolve(bitmap);
    };
    const timer = setTimeout(
      () => finish(new Error("Photo conversion timed out")),
      90000,
    );
    worker.onmessage = ({ data }) =>
      finish(data.error ? new Error(data.error) : null, data.bitmap);
    worker.onerror = () => finish(new Error("Photo conversion failed"));
    worker.postMessage(file);
  });
}

async function optimizePhoto(file) {
  const heic =
    /^image\/hei[cf](?:-sequence)?$/i.test(file.type) ||
    /\.hei[cf]$/i.test(file.name);
  if (!heic && !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Please choose JPG, PNG, WebP or iPhone HEIC photos.");
  if (file.size > 20000000)
    throw new Error("Please choose photos smaller than 20 MB each.");
  let bitmap;
  let canvas;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (!heic)
      throw new Error("This photo could not be opened. Try another photo.");
    try {
      bitmap = await decodeHeic(file);
    } catch {
      throw new Error(
        "This iPhone photo could not be converted. Try taking a new photo or choosing a JPG.",
      );
    }
  }
  try {
    const scale = Math.min(
      1,
      PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height),
    );
    canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context)
      throw new Error(
        "This browser could not prepare your photos. Try another browser.",
      );
    const quality = assess(bitmap, canvas, context);
    if (quality.reject) throw new Error(quality.reject);
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let blob;
    for (const level of [0.9, 0.82, 0.72, 0.6]) {
      blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", level),
      );
      if (blob && blob.size <= MAX_PHOTO_BYTES) break;
    }
    if (!blob || blob.size > MAX_PHOTO_BYTES)
      throw new Error(
        "This photo is still too large. Try a closer crop of the slab.",
      );
    const result = new File(
      [blob],
      file.name.replace(/\.[^.]+$/, "") + ".jpg",
      { type: "image/jpeg" },
    );
    // The upload keeps its full size; the grid only decodes a 320px preview.
    const previewScale = Math.min(
      1,
      320 / Math.max(bitmap.width, bitmap.height),
    );
    canvas.width = Math.max(1, Math.round(bitmap.width * previewScale));
    canvas.height = Math.max(1, Math.round(bitmap.height * previewScale));
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const preview = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.75),
    );
    if (!preview)
      throw new Error(
        "This photo preview could not be prepared. Please choose the photo again.",
      );
    previews.set(result, preview);
    if (quality.warnings.length) warnings.set(result, quality.warnings);
    return result;
  } finally {
    bitmap.close();
    // Safari can retain canvas backing stores beyond garbage collection.
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
