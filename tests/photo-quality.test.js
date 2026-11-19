import test from "node:test";
import assert from "node:assert/strict";
import {
  analysisSize,
  photoMetrics,
  assessPhoto,
  ANALYSIS_EDGE,
} from "../lib/photo-quality.js";
import { preparePhoto, photoWarnings } from "../lib/prepare-photo.js";
import { uploadPhoto } from "../lib/upload-photo.js";
import { stagePhoto } from "../lib/submission-uploads.js";
import { MAX_PHOTO_BYTES } from "../lib/photo-selection.js";
import { storedPhoto } from "../lib/draft-photos.js";

// A synthetic "slab on a desk": a mid-grey background with a framed card that
// carries fine dark-on-light detail, like label text.
function scene(width, height, { blur = 0, gain = 1, lift = 0 } = {}) {
  let grey = new Float32Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const inCard =
        x > width * 0.3 && x < width * 0.7 && y > height * 0.2 && y < height * 0.8;
      const text = (Math.floor(x / 3) + Math.floor(y / 5)) % 2 ? 235 : 40;
      grey[y * width + x] = inCard ? text : 135;
    }
  for (let pass = 0; pass < blur; pass++) {
    const next = new Float32Array(grey.length);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let n = 0;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            const yy = y + dy;
            const xx = x + dx;
            if (yy < 0 || yy >= height || xx < 0 || xx >= width) continue;
            sum += grey[yy * width + xx];
            n++;
          }
        next[y * width + x] = sum / n;
      }
    grey = next;
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < grey.length; i++) {
    const value = grey[i] * gain + lift;
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = value;
    data[i * 4 + 3] = 255;
  }
  return { data, width, height };
}
const camera = { width: 4032, height: 3024 };
const check = (pixels, source = camera) =>
  assessPhoto(photoMetrics(pixels), source);

test("photos are analysed at a bounded size and never upscaled", () => {
  assert.deepEqual(analysisSize(4032, 3024), { width: ANALYSIS_EDGE, height: 768 });
  assert.deepEqual(analysisSize(600, 900), { width: 600, height: 900 });
});

test("a sharp, well-lit photo passes without warnings, even when the item is small in the frame", () => {
  assert.deepEqual(check(scene(512, 384)), { reject: null, warnings: [] });
});

test("blurry, dark and tiny photos are refused with a retake instruction", () => {
  assert.match(check(scene(512, 384, { blur: 6 })).reject, /blurry.*retake/i);
  assert.match(check(scene(512, 384, { gain: 0.1 })).reject, /dark.*Retake/);
  assert.match(
    check(scene(512, 384), { width: 480, height: 640 }).reject,
    /too small/,
  );
});

test("borderline photos are accepted with a warning the seller can act on", () => {
  const soft = check(scene(512, 384, { blur: 1, gain: 0.6 }));
  assert.equal(soft.reject, null);
  assert.ok(soft.warnings.some((w) => /blurry/i.test(w)));
  const glare = check(scene(512, 384, { gain: 1, lift: 130 }));
  assert.equal(glare.reject, null);
  assert.ok(glare.warnings.some((w) => /glare/i.test(w)));
  const small = check(scene(512, 384), { width: 1000, height: 750 });
  assert.equal(small.reject, null);
  assert.ok(small.warnings.some((w) => /resolution/i.test(w)));
});

test("preparation refuses an unreadable photo before upload and carries warnings through to the form and the saved draft", async () => {
  // The analysis canvas for a 4032x3024 photo is 1024x768.
  let pixels = scene(1024, 768, { blur: 6 });
  const bitmapBefore = globalThis.createImageBitmap;
  const documentBefore = globalThis.document;
  globalThis.createImageBitmap = async () => ({ ...camera, close() {} });
  globalThis.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        fillRect() {},
        drawImage() {},
        getImageData: () => pixels,
      }),
      toBlob: (callback, type) => callback(new Blob(["jpeg"], { type })),
    }),
  };
  try {
    const input = () => new File(["source"], "slab.jpg", { type: "image/jpeg" });
    let sent = 0;
    const send = async () => {
      sent++;
      return { token: "a".repeat(64), expiresAt: Date.now() + 1000 };
    };
    const id = "5affbb6e-d6f6-4bcc-8946-31df2ab5d059";
    await assert.rejects(uploadPhoto(input(), id, { send }), /too blurry/);
    assert.equal(sent, 0, "A refused photo is never uploaded");

    pixels = scene(1024, 768, { blur: 1, gain: 0.6 });
    const soft = await preparePhoto(input());
    assert.ok(photoWarnings(soft).some((w) => /blurry/i.test(w)));
    const uploaded = await uploadPhoto(input(), id, { send });
    assert.equal(sent, 1);
    assert.ok(uploaded.warnings.some((w) => /blurry/i.test(w)));
    assert.deepEqual(storedPhoto(id, uploaded).warnings, uploaded.warnings);

    pixels = scene(1024, 768);
    assert.deepEqual(photoWarnings(await preparePhoto(input())), []);
  } finally {
    if (bitmapBefore === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = bitmapBefore;
    if (documentBefore === undefined) delete globalThis.document;
    else globalThis.document = documentBefore;
  }
});

test("the server accepts a photo up to the shared size limit and refuses a larger one", async () => {
  const id = "5affbb6e-d6f6-4bcc-8946-31df2ab5d059";
  const photo = (size) => {
    const bytes = new Uint8Array(size);
    bytes.set([255, 216, 255]);
    return new File([bytes], "slab.jpg", { type: "image/jpeg" });
  };
  const stored = [];
  const sql = { query: async (text) => (/count\(\*\)/.test(text) ? [{ count: 0 }] : /INSERT/.test(text) ? [{ created_at: new Date() }] : []) };
  const deps = {
    sql,
    put: async (path, bytes) => {
      stored.push(bytes.length);
      return { url: "https://test.private.blob.vercel-storage.com/" + path, pathname: path };
    },
    del: async () => {},
  };
  assert.equal(MAX_PHOTO_BYTES, 1000000);
  await stagePhoto(id, photo(MAX_PHOTO_BYTES), deps);
  assert.deepEqual(stored, [MAX_PHOTO_BYTES]);
  await assert.rejects(stagePhoto(id, photo(MAX_PHOTO_BYTES + 1), deps), /too large/);
  assert.equal(stored.length, 1);
});
