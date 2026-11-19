import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  retakeToken,
  retakeId,
  createRetake,
  latestRetake,
  publicRetake,
  retakeMessage,
  deliverRetakeEmail,
  replaceRetakePhoto,
  createAdminRetakeHandler,
  createRetakeUploadHandler,
  RetakeError,
} from "../lib/photo-retakes";
import { purchaseToken } from "../lib/purchase-token";
import { MAX_PHOTO_BYTES } from "../lib/photo-selection";

const secret = "s".repeat(40);
const id = "9affbb6e-d6f6-4bcc-8946-31df2ab5d059";
const jpeg = (size = 8) => {
  const bytes = new Uint8Array(size);
  bytes.set([255, 216, 255]);
  return new File([bytes], "retake.jpg", { type: "image/jpeg" });
};
const cards = [
  { itemType: "Graded card", name: "Charizard ex", category: "Pokémon", grader: "PSA", grade: "10", quantity: 1, asking: "" },
];
const original = [
  { url: "https://blob/front", pathname: "submissions/x/front", type: "image/jpeg", previewPathname: "submissions/x/front-preview", item: 0, side: "front" },
  { url: "https://blob/back", pathname: "submissions/x/back", type: "image/jpeg", item: 0, side: "back" },
  { url: "https://blob/group", pathname: "submissions/x/group", type: "image/jpeg" },
];

async function setup() {
  const db = new PGlite();
  await db.exec(await readFile(new URL("../scripts/schema.sql", import.meta.url), "utf8"));
  const sql = { query: async (q, p) => (await db.query(q, p)).rows };
  await sql.query(
    "INSERT INTO submissions(id,seller_name,email,phone,seller_notes,cards,photos,sale_method) VALUES($1,'Sam Seller','seller@example.com','','',$2::jsonb,$3::jsonb,'direct')",
    [id, JSON.stringify(cards), JSON.stringify(original)],
  );
  const stored = [];
  const put = async (path, bytes) => {
    stored.push(path);
    return { url: "https://blob/" + path, pathname: path };
  };
  return { db, sql, put, stored };
}

test("retake links are signed for one request and one purpose", () => {
  process.env.SESSION_SECRET = secret;
  const token = retakeToken(id);
  assert.equal(retakeId(token), id);
  assert.equal(retakeId(token.slice(0, -1) + (token.endsWith("A") ? "B" : "A")), null);
  assert.equal(retakeId(purchaseToken(id)), null, "An offer link cannot be used as a retake link");
  assert.equal(retakeId("nonsense"), null);
});

test("a retake request names real photos, replaces an earlier open request, and the seller email lists what is needed", async () => {
  process.env.SESSION_SECRET = secret;
  const { db, sql } = await setup();
  try {
    for (const photos of [[], [7], [-1], [0.5], "0", Array.from({ length: 21 }, (_, i) => i)])
      await assert.rejects(createRetake(sql, { submissionId: id, photos, note: "" }), RetakeError);
    await assert.rejects(
      createRetake(sql, { submissionId: "0affbb6e-d6f6-4bcc-8946-31df2ab5d059", photos: [0], note: "" }),
      (error) => error.status === 404,
    );
    const first = await createRetake(sql, { submissionId: id, photos: [1], note: "" });
    const second = await createRetake(sql, { submissionId: id, photos: [2, 0, 0], note: "  Glare hides the cert number. " });
    assert.equal(await publicRetake(sql, retakeToken(first)), null, "The earlier link stops working");
    const summary = await latestRetake(sql, id);
    assert.deepEqual([summary.id, summary.open, summary.replaced, summary.note], [second, true, 0, "Glare hides the cert number."]);
    assert.deepEqual(summary.photos.map((p) => [p.index, p.label, p.item]), [
      [0, "Item 1 · Front", "Charizard ex"],
      [2, "Photo 3", ""],
    ]);
    const seller = await publicRetake(sql, retakeToken(second));
    assert.equal(seller.reference, "9AFFBB6E");
    assert.ok(!JSON.stringify(seller).includes("seller@example.com"));
    assert.ok(!JSON.stringify(seller).includes("submissions/x"));

    let sent;
    const status = await deliverRetakeEmail(second, {
      sql,
      mailConfig: () => ({ from: "SellMySlabs <requests@example.com>", replyTo: "owner@example.com", site: "https://www.sellmyslabs.net" }),
      fetchEmail: async (url, options) => {
        sent = { key: options.headers["Idempotency-Key"], ...JSON.parse(options.body) };
        return Response.json({ id: "email_1" });
      },
    });
    assert.equal(status, "failed", "Without an email key the request is saved and flagged, not lost");
    process.env.RESEND_API_KEY = "test";
    try {
      assert.equal(
        await deliverRetakeEmail(second, {
          sql,
          mailConfig: () => ({ from: "SellMySlabs <requests@example.com>", replyTo: "owner@example.com", site: "https://www.sellmyslabs.net" }),
          fetchEmail: async (url, options) => {
            sent = { key: options.headers["Idempotency-Key"], ...JSON.parse(options.body) };
            return Response.json({ id: "email_1" });
          },
        }),
        "sent",
      );
    } finally {
      delete process.env.RESEND_API_KEY;
    }
    assert.deepEqual(sent.to, ["seller@example.com"]);
    assert.deepEqual(sent.bcc, ["owner@example.com"]);
    assert.equal(sent.key, `retake-${second}`);
    assert.match(sent.text, /Item 1 · Front \(Charizard ex\)/);
    assert.match(sent.text, /Glare hides the cert number/);
    assert.ok(sent.text.includes(`https://www.sellmyslabs.net/retake/${retakeToken(second)}`));
    assert.equal((await latestRetake(sql, id)).emailStatus, "sent");
  } finally {
    await db.close();
  }
});

test("a seller's new photo replaces only a requested photo, keeps its item label and the original on file", async () => {
  process.env.SESSION_SECRET = secret;
  const { db, sql, put, stored } = await setup();
  try {
    const retake = await createRetake(sql, { submissionId: id, photos: [0, 2], note: "" });
    const token = retakeToken(retake);
    const deps = { sql, put };
    await assert.rejects(replaceRetakePhoto(deps, { token, index: 1, file: jpeg() }), /not requested/);
    await assert.rejects(replaceRetakePhoto(deps, { token: purchaseToken(id), index: 0, file: jpeg() }), /no longer active/);
    await assert.rejects(replaceRetakePhoto(deps, { token, index: 0, file: jpeg(MAX_PHOTO_BYTES + 1) }), /too large/);
    await assert.rejects(
      replaceRetakePhoto(deps, { token, index: 0, file: new File([new Uint8Array(8)], "x.jpg") }),
      /JPG, PNG or WebP/,
    );
    assert.equal(stored.length, 0, "Nothing is stored for a refused photo");

    const first = await replaceRetakePhoto(deps, { token, index: 0, file: jpeg(), preview: jpeg() });
    assert.equal(first.complete, false);
    assert.deepEqual(first.photos.map((p) => p.done), [true, false]);
    const again = await replaceRetakePhoto(deps, { token, index: 0, file: jpeg() });
    assert.equal(again.complete, false);
    const done = await replaceRetakePhoto(deps, { token, index: 2, file: jpeg() });
    assert.equal(done.complete, true);

    const [row] = await sql.query("SELECT photos FROM submissions WHERE id=$1", [id]);
    const [front, back, group] = row.photos;
    assert.deepEqual([front.item, front.side, front.retake], [0, "front", retake]);
    assert.ok(front.pathname.startsWith(`submissions/${id}/retakes/`));
    assert.equal(front.previous.pathname, "submissions/x/front", "The seller's first photo stays on file across repeat retakes");
    assert.equal(front.previewPathname, undefined, "A replacement without a preview does not keep the old photo's preview");
    assert.deepEqual(back, original[1], "A photo that was not requested is untouched");
    assert.equal(group.previous.pathname, "submissions/x/group");
    const summary = await latestRetake(sql, id);
    assert.equal(summary.replaced, 2);

    const newer = await createRetake(sql, { submissionId: id, photos: [1], note: "" });
    await assert.rejects(replaceRetakePhoto(deps, { token, index: 0, file: jpeg() }), /no longer active/);
    assert.equal((await replaceRetakePhoto(deps, { token: retakeToken(newer), index: 1, file: jpeg() })).complete, true);
  } finally {
    await db.close();
  }
});

test("only the signed-in owner can request a retake, and the seller upload endpoint guards origin, size and rate", async () => {
  process.env.SESSION_SECRET = secret;
  const { db, sql, put } = await setup();
  try {
    const delivered = [];
    const admin = (signedIn, sameOrigin = true) =>
      createAdminRetakeHandler({
        sql: () => sql,
        signedIn: async () => signedIn,
        sameOrigin: () => sameOrigin,
        mailConfig: () => ({}),
        deliver: async (retake) => delivered.push(retake),
      });
    const ask = (body) =>
      new Request("https://www.sellmyslabs.net/api/admin/retake", { method: "POST", body: JSON.stringify(body) });
    assert.equal((await admin(false)(ask({ id, photos: [0] }))).status, 401);
    assert.equal((await admin(true, false)(ask({ id, photos: [0] }))).status, 403);
    assert.equal((await admin(true)(ask({ id, photos: [9] }))).status, 400);
    assert.equal(delivered.length, 0);
    const created = await admin(true)(ask({ id, photos: [0], note: "Blurry" }));
    assert.equal(created.status, 201);
    const { retake } = await created.json();
    assert.deepEqual(delivered, [retake.id]);

    const upload = (overrides = {}) =>
      createRetakeUploadHandler({
        sql: () => sql,
        put,
        configured: () => true,
        sameOrigin: () => true,
        limited: async () => false,
        ...overrides,
      });
    const send = (handler, token, index, headers = {}) => {
      const body = new FormData();
      body.set("index", String(index));
      body.set("photo", jpeg());
      return handler(
        new Request("https://www.sellmyslabs.net/api/retake/x", { method: "POST", body, headers }),
        { params: Promise.resolve({ token }) },
      );
    };
    const token = retakeToken(retake.id);
    assert.equal((await send(upload({ sameOrigin: () => false }), token, 0)).status, 403);
    assert.equal((await send(upload({ configured: () => false }), token, 0)).status, 503);
    assert.equal((await send(upload({ limited: async () => true }), token, 0)).status, 429);
    assert.equal((await send(upload(), "bad-token", 0)).status, 404);
    assert.equal((await send(upload(), token, 2)).status, 400);
    const ok = await send(upload(), token, 0);
    assert.equal(ok.status, 201);
    assert.equal((await ok.json()).complete, true);
  } finally {
    await db.close();
  }
});
