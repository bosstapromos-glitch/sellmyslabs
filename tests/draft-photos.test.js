import test from "node:test";
import assert from "node:assert/strict";
import { storedPhoto, restorePhotoRecords } from "../lib/draft-photos";
import { prepareSelection } from "../lib/photo-selection";
const id = "5affbb6e-d6f6-4bcc-8946-31df2ab5d059";
const other = "6affbb6e-d6f6-4bcc-8946-31df2ab5d059";
const now = Date.now();
const photo = (n) => ({
  token: n.toString(16).padStart(64, "0"),
  name: `Photo ${n}`,
  preview: new Blob(["preview"], { type: "image/jpeg" }),
  expiresAt: now + 30 * 86400000,
});
test("restores 100 small previews in saved order without originals, excludes foreign/expired/damaged records", () => {
  const rows = Array.from({ length: 100 }, (_, i) =>
    storedPhoto(id, photo(i + 1)),
  );
  const restored = restorePhotoRecords(id, structuredClone(rows), now);
  assert.equal(restored.photos.length, 100);
  assert.equal(restored.expired, 0);
  assert.deepEqual(
    restored.photos.map((p) => p.token),
    rows.map((p) => p.token),
  );
  assert.ok(
    restored.photos.every(
      (p) => p.persisted && p.preview instanceof Blob && !("file" in p),
    ),
  );
  const mixed = restorePhotoRecords(
    id,
    [
      rows[0],
      { ...rows[1], expiresAt: now - 1 },
      { ...rows[2], preview: "javascript:bad" },
      storedPhoto(other, photo(200)),
    ],
    now,
  );
  assert.equal(mixed.photos.length, 1);
  assert.equal(mixed.expired, 2);
  assert.throws(() =>
    storedPhoto(id, {
      ...photo(1),
      preview: new Blob(["x"], { type: "text/html" }),
    }),
  );
  assert.throws(() => storedPhoto(id, { ...photo(1), token: "forged" }));
});
test("batch upload waits for each photo to finish saving before advancing", async () => {
  const events = [];
  const result = await prepareSelection(
    [{ name: "a" }, { name: "b" }],
    100,
    async (f) => {
      events.push(`upload ${f.name}`);
      return f;
    },
    async (f) => {
      await new Promise((resolve) => setTimeout(resolve, 2));
      events.push(`saved ${f.name}`);
    },
    () => {},
  );
  assert.equal(result.added, 2);
  assert.deepEqual(events, ["upload a", "saved a", "upload b", "saved b"]);
});
