import { createSubmissionHandler } from "../lib/submission-handler";
import { createPhotoUploadHandler } from "../lib/photo-upload-handler";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  stagePhoto,
  resolveUploads,
  cleanupUploads,
  uploadHash,
} from "../lib/submission-uploads";
import { uploadPhoto } from "../lib/upload-photo";
import {
  prepareSelection,
  MAX_SUBMISSION_PHOTOS,
} from "../lib/photo-selection";
const id = "5affbb6e-d6f6-4bcc-8946-31df2ab5d059";
const other = "6affbb6e-d6f6-4bcc-8946-31df2ab5d059";
const jpeg = () =>
  new File([new Uint8Array([255, 216, 255, 1, 2, 3])], "slab.jpg", {
    type: "image/jpeg",
  });

test("100 separate private uploads resolve in order, persist together, reject stolen/expired/forged receipts, and cleanup preserves submitted photos", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(new URL("../scripts/schema.sql", import.meta.url), "utf8"),
    );
    const sql = async (parts, ...values) =>
      (
        await db.query(
          parts.reduce((text, part, i) => text + (i ? "$" + i : "") + part, ""),
          values,
        )
      ).rows;
    sql.query = async (q, p) => (await db.query(q, p)).rows;
    const blobs = new Map(),
      deleted = [];
    const put = async (path, bytes, options) => {
      assert.equal(options.access, "private");
      assert.ok(bytes.length <= 350000);
      const url = "https://test.private.blob.vercel-storage.com/" + path;
      blobs.set(url, bytes);
      return { url, pathname: path };
    };
    const del = async (url) => {
      deleted.push(url);
      blobs.delete(url);
    };
    const deps = { sql, put, del },
      tokens = [];
    for (let i = 0; i < 100; i++)
      tokens.push((await stagePhoto(id, jpeg(), deps)).token);
    assert.equal(MAX_SUBMISSION_PHOTOS, 100);
    const photos = await resolveUploads(id, tokens, sql);
    assert.equal(photos.length, 100);
    assert.deepEqual(
      await resolveUploads(id, tokens.slice().reverse(), sql),
      photos.slice().reverse(),
    );
    await assert.rejects(resolveUploads(other, tokens, sql), /expired|found/);
    await assert.rejects(
      resolveUploads(id, [tokens[0], tokens[0]], sql),
      /different/,
    );
    await assert.rejects(
      resolveUploads(id, [...tokens, tokens[0]], sql),
      /100/,
    );
    await assert.rejects(
      resolveUploads(id, ["0".repeat(64)], sql),
      /expired|found/,
    );
    await assert.rejects(
      resolveUploads(id, [{ url: "https://evil.example" }], sql),
      /different/,
    );
    await assert.rejects(
      stagePhoto(
        id,
        new File(["bad"], "bad.jpg", { type: "image/jpeg" }),
        deps,
      ),
      /Choose/,
    );
    await assert.rejects(
      stagePhoto(id, new File([new Uint8Array(350001)], "large.jpg"), deps),
      /large/,
    );
    await assert.rejects(stagePhoto("invalid", jpeg(), deps), /reload/);
    let notified = 0;
    const pending = [];
    const submit = createSubmissionHandler({
      db: () => sql,
      put,
      del,
      configured: () => true,
      sameOrigin: () => true,
      limited: async () => false,
      after: (fn) => pending.push(fn()),
      notifySubmission: async () => {
        notified++;
      },
    });
    const submitRequest = () => {
      const body = new FormData();
      body.set(
        "data",
        JSON.stringify({
          id,
          name: "Upload QA",
          email: "test@example.com",
          phone: "",
          notes: "",
          consent: true,
          website: "",
          cards: [
            {
              itemType: "Graded card",
              name: "Test slab",
              category: "Pokémon",
              grader: "TAG",
              grade: "9",
              quantity: 100,
              asking: "",
            },
          ],
        }),
      );
      body.set("uploads", JSON.stringify(tokens));
      return new Request("https://example.com/api/submissions", {
        method: "POST",
        body,
      });
    };
    const response = await submit(submitRequest());
    assert.equal(response.status, 201, JSON.stringify(await response.json()));
    await Promise.all(pending);
    assert.equal(notified, 1);
    assert.equal(
      (await submit(submitRequest())).status,
      200,
      "Lost response retry does not duplicate the submission",
    );
    assert.equal(notified, 1);
    assert.equal(
      (await sql.query("SELECT photos FROM submissions WHERE id=$1", [id]))[0]
        .photos.length,
      100,
    );
    await assert.rejects(stagePhoto(id, jpeg(), deps), /already been sent/);
    const orphan = await stagePhoto(other, jpeg(), deps);
    await sql.query(
      "UPDATE submission_uploads SET created_at=now()-interval '29 days'",
      [],
    );
    assert.equal(
      (await resolveUploads(id, tokens, sql)).length,
      100,
      "Saved drafts remain usable on day 29",
    );
    assert.equal(
      await cleanupUploads(sql, del),
      0,
      "Cleanup keeps unexpired draft photos",
    );
    await sql.query(
      "UPDATE submission_uploads SET created_at=now()-interval '32 days'",
      [],
    );
    await assert.rejects(resolveUploads(id, tokens, sql), /expired/);
    await cleanupUploads(sql, del);
    await cleanupUploads(sql, del);
    assert.equal(blobs.size, 100);
    assert.equal(deleted.length, 1);
    assert.equal(
      (await sql.query("SELECT * FROM submission_uploads", [])).length,
      0,
    );
    assert.ok(orphan.token);
  } finally {
    await db.close();
  }
});

test("failed storage records remove only their own blob and propagate failure", async () => {
  let removed;
  const sql = {
    query: async (q) => {
      if (q.startsWith("SELECT id")) return [];
      if (q.startsWith("SELECT count")) return [{ count: 0 }];
      throw Error("DB unavailable");
    },
  };
  await assert.rejects(
    stagePhoto(id, jpeg(), {
      sql,
      put: async () => ({ url: "private-test", pathname: "test" }),
      del: async (url) => {
        removed = url;
      },
    }),
    /DB unavailable/,
  );
  assert.equal(removed, "private-test");
});

test("large batches await each upload, keep only preview+receipt, and recover from a failed upload", async () => {
  let active = 0,
    peak = 0,
    calls = 0;
  const preview = new Blob(["tiny-preview"], { type: "image/jpeg" });
  const queue = Array.from(
    { length: 101 },
    (_, i) => new File(["original"], `slab-${i}.jpg`),
  );
  const saved = [];
  const result = await prepareSelection(
    queue,
    100,
    (file) =>
      uploadPhoto(file, id, {
        prepare: async () => jpeg(),
        preview: () => preview,
        send: async (url, options) => {
          active++;
          peak = Math.max(peak, active);
          calls++;
          assert.equal(url, "/api/submissions/photos");
          assert.equal(options.body.get("id"), id);
          await new Promise((resolve) => setTimeout(resolve, 1));
          active--;
          if (calls === 9) throw Error("Connection interrupted");
          return { token: calls.toString(16).padStart(64, "0") };
        },
      }),
    (photo) => saved.push(photo),
    () => {},
  );
  assert.equal(saved.length, 100);
  assert.equal(peak, 1);
  assert.equal(queue.length, 0);
  assert.equal(result.failures.length, 1);
  assert.equal(saved[8].name, "slab-9.jpg");
  assert.ok(
    saved.every(
      (p) =>
        Object.keys(p).sort().join(",") === "expiresAt,name,preview,token" &&
        p.preview === preview,
    ),
  );
  assert.ok(
    JSON.stringify(saved.map((p) => p.token)).length < 10000,
    "Final submission sends small receipts, not photo bytes",
  );
});

test("upload endpoint rejects cross-origin, oversized, unavailable and rate-limited requests before storage", async () => {
  let storageCalls = 0;
  const deps = {
    put: async () => {
      storageCalls++;
    },
    del: async () => {},
    db: () => {},
    configured: () => true,
    sameOrigin: (r) => r.headers.get("origin") === "https://example.com",
    limited: async () => false,
  };
  const req = (headers = {}) =>
    new Request("https://example.com/api/submissions/photos", {
      method: "POST",
      headers,
    });
  assert.equal((await createPhotoUploadHandler(deps)(req())).status, 403);
  assert.equal(
    (
      await createPhotoUploadHandler(deps)(
        req({ origin: "https://example.com", "content-length": "400001" }),
      )
    ).status,
    413,
  );
  assert.equal(
    (
      await createPhotoUploadHandler({ ...deps, configured: () => false })(
        req({ origin: "https://example.com" }),
      )
    ).status,
    503,
  );
  assert.equal(
    (
      await createPhotoUploadHandler({ ...deps, limited: async () => true })(
        req({ origin: "https://example.com" }),
      )
    ).status,
    429,
  );
  assert.equal(storageCalls, 0);
});
