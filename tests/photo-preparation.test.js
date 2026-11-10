import test from "node:test";
import assert from "node:assert/strict";
import { preparePhoto, photoPreview } from "../lib/prepare-photo.js";
import { prepareSelection } from "../lib/photo-selection.js";

test("photo processing releases pixel buffers on success and failure, keeps previews small, and serializes concurrent calls", async (t) => {
  let active = 0,
    peak = 0,
    failEncoding = false;
  const canvases = [],
    bitmaps = [],
    sizes = [];
  const bitmapBefore = globalThis.createImageBitmap;
  globalThis.createImageBitmap = async () => {
    active++;
    peak = Math.max(peak, active);
    const bitmap = {
      width: 6000,
      height: 4000,
      closed: false,
      close() {
        this.closed = true;
        active--;
      },
    };
    bitmaps.push(bitmap);
    return bitmap;
  };
  const documentBefore = globalThis.document;
  globalThis.document = {
    createElement() {
      const canvas = {
        width: 0,
        height: 0,
        getContext() {
          return { fillRect() {}, drawImage() {} };
        },
        toBlob(callback, type) {
          sizes.push([this.width, this.height]);
          setTimeout(
            () => callback(failEncoding ? null : new Blob(["jpeg"], { type })),
            1,
          );
        },
      };
      canvases.push(canvas);
      return canvas;
    },
  };
  try {
    const input = () =>
      new File(["source"], "slab.jpg", { type: "image/jpeg" });
    const files = await Promise.all(
      Array.from({ length: 8 }, () => preparePhoto(input())),
    );
    assert.equal(peak, 1);
    assert.equal(files.length, 8);
    assert.ok(
      files.every((file) => file.type === "image/jpeg" && file.size <= 350000),
    );
    assert.ok(files.every((file) => photoPreview(file) !== file));
    assert.ok(sizes.some(([w, h]) => w === 1800 && h === 1200));
    assert.ok(sizes.some(([w, h]) => w === 320 && h === 213));
    assert.ok(bitmaps.every((b) => b.closed));
    assert.ok(canvases.every((c) => c.width === 0 && c.height === 0));
    failEncoding = true;
    await assert.rejects(preparePhoto(input()), /too large/);
    assert.equal(active, 0);
    assert.ok(canvases.every((c) => c.width === 0 && c.height === 0));
    failEncoding = false;
    await preparePhoto(input());
    assert.equal(active, 0, "A failed photo does not block subsequent photos");
  } finally {
    if (bitmapBefore === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = bitmapBefore;
    if (documentBefore === undefined) delete globalThis.document;
    else globalThis.document = documentBefore;
  }
});

test("batch preparation retains successes, continues after corrupt photos, and releases the original file queue", async () => {
  const queue = Array.from({ length: 11 }, (_, i) => ({ name: `${i}.jpg` }));
  const added = [],
    progress = [];
  const result = await prepareSelection(
    queue,
    8,
    async (file) => {
      if (file.name === "2.jpg") throw Error("Unreadable photo");
      return file.name;
    },
    (file) => added.push(file),
    (value) => progress.push(value),
  );
  assert.equal(added.length, 8);
  assert.ok(added.includes("0.jpg") && added.includes("8.jpg"));
  assert.equal(result.skipped, 2);
  assert.deepEqual(result.failures, ["2.jpg: Unreadable photo"]);
  assert.equal(queue.length, 0);
  assert.deepEqual(progress.at(-1), { current: 9, total: 11 });
});
