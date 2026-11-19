import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  cleanLabel,
  labelsOf,
  labelText,
  missingItemPhotos,
  relabelAfterRemoval,
  unlabelAll,
} from "../lib/photo-labels";
import { stepErrors } from "../lib/sell-validation";
import { storedPhoto } from "../lib/draft-photos";
import { createSubmissionHandler } from "../lib/submission-handler";
import { stagePhoto } from "../lib/submission-uploads";

const id = "7affbb6e-d6f6-4bcc-8946-31df2ab5d059";
const slab = {
  itemType: "Graded card",
  name: "Test slab",
  category: "Pokémon",
  grader: "PSA",
  grade: "10",
  cert: "",
  condition: "",
  quantity: 1,
  asking: "",
};
const sealed = { ...slab, itemType: "Sealed product", name: "Booster box", grader: "", grade: "" };
const front = (item) => ({ item, side: "front" });
const back = (item) => ({ item, side: "back" });

test("labels accept only a real item and side; anything else is a general photo", () => {
  assert.deepEqual(cleanLabel(front(2), 3), front(2));
  for (const bad of [null, {}, front(3), front(-1), front(1.5), { item: 0, side: "top" }, { item: "0", side: "front" }])
    assert.deepEqual(cleanLabel(bad, 3), { item: null, side: null });
  assert.equal(labelText(back(1)), "Item 2 · Back");
  assert.equal(labelText({}), "");
  assert.deepEqual(labelsOf([front(0), { token: "x" }], 1), [
    front(0),
    { item: null, side: null },
  ]);
});

test("graded cards need a front and a back; raw cards and sealed product do not", () => {
  assert.deepEqual(missingItemPhotos([slab, sealed, slab], [front(0), back(0), front(2)]), [
    { index: 2, sides: ["back"] },
  ]);
  const draft = { cards: [slab, sealed], askingTotal: "" };
  assert.deepEqual(stepErrors(draft, 2, 0, [front(0), back(0)]), {});
  assert.match(stepErrors(draft, 1, 0, [front(0)])["item-0-photos"], /back/);
  assert.match(stepErrors(draft, 1, 0, [{}])["item-0-photos"], /front and a back/);
  assert.deepEqual(
    stepErrors(draft, 1, 0),
    {},
    "Callers that pass only a count keep the previous behaviour",
  );
});

test("removing an item frees its photos and moves later items' photos up; a CSV import frees them all", () => {
  const photos = [front(0), back(0), front(1), back(2), { item: null, side: null }];
  assert.deepEqual(
    relabelAfterRemoval(photos, 1).map(({ item, side }) => [item, side]),
    [[0, "front"], [0, "back"], [null, null], [1, "back"], [null, null]],
  );
  assert.ok(unlabelAll(photos).every((p) => p.item === null));
});

test("a saved draft photo keeps its label and its place in the order when relabelled", () => {
  const photo = {
    token: "a".repeat(64),
    name: "front.jpg",
    preview: new Blob(["x"], { type: "image/jpeg" }),
    expiresAt: Date.now() + 1000,
    savedAt: 1234,
    ...front(4),
  };
  const saved = storedPhoto(id, photo);
  assert.deepEqual([saved.item, saved.side, saved.savedAt], [4, "front", 1234]);
  assert.deepEqual(
    [storedPhoto(id, { ...photo, item: 99 }).item, storedPhoto(id, { ...photo, side: "x" }).side],
    [null, null],
  );
});

test("the submission stores each photo's item and side, refuses a graded card without both sides, and still accepts older tabs that send no labels", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile(new URL("../scripts/schema.sql", import.meta.url), "utf8"));
    const sql = async (parts, ...values) =>
      (await db.query(parts.reduce((text, part, i) => text + (i ? "$" + i : "") + part, ""), values)).rows;
    sql.query = async (q, p) => (await db.query(q, p)).rows;
    const put = async (path) => ({ url: "https://test.private.blob.vercel-storage.com/" + path, pathname: path });
    const deps = { sql, put, del: async () => {} };
    const jpeg = () => new File([new Uint8Array([255, 216, 255, 1])], "slab.jpg", { type: "image/jpeg" });
    const submit = createSubmissionHandler({
      db: () => sql,
      put,
      del: async () => {},
      configured: () => true,
      sameOrigin: () => true,
      limited: async () => false,
      after: () => {},
      notifySubmission: async () => {},
    });
    const send = async (requestId, labels) => {
      const tokens = [];
      for (let i = 0; i < 3; i++) tokens.push((await stagePhoto(requestId, jpeg(), deps)).token);
      const body = new FormData();
      body.set(
        "data",
        JSON.stringify({ id: requestId, name: "Label QA", email: "test@example.com", phone: "(208) 555-0100", notes: "", consent: true, website: "", cards: [slab, sealed] }),
      );
      body.set("uploads", JSON.stringify(tokens));
      if (labels) body.set("labels", JSON.stringify(labels));
      return submit(new Request("https://www.sellmyslabs.net/api/submissions", { method: "POST", body }));
    };
    const refused = await send(id, [front(0), {}, {}]);
    assert.equal(refused.status, 400);
    assert.match((await refused.json()).error, /Item 1: Add a photo of the back/);

    const mismatched = await send(id, [front(0), back(0)]);
    assert.equal(mismatched.status, 400);

    const accepted = await send(id, [front(0), back(0), front(7)]);
    assert.ok(accepted.ok, `expected success, got ${accepted.status}`);
    const [row] = await sql.query("SELECT photos FROM submissions WHERE id=$1", [id]);
    assert.deepEqual(
      row.photos.map((p) => [p.item ?? null, p.side ?? null]),
      [[0, "front"], [0, "back"], [null, null]],
      "A label pointing at an item that does not exist is stored as a general photo",
    );

    const legacyId = "8affbb6e-d6f6-4bcc-8946-31df2ab5d059";
    const legacy = await send(legacyId, null);
    assert.ok(legacy.ok, `expected success, got ${legacy.status}`);
  } finally {
    await db.close();
  }
});
