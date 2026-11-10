import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { emptyDraft } from "../lib/draft";
import {
  saveAccountDraft,
  readAccountDraft,
  listAccountDrafts,
  closeAccountDraft,
  accountDraftPhoto,
} from "../lib/account-drafts";
import {
  stagePhoto,
  uploadHash,
  cleanupUploads,
} from "../lib/submission-uploads";
import { createAccountDraftHandler } from "../lib/account-draft-handler";
import { createSubmissionHandler } from "../lib/submission-handler";
const alice = {
    id: "user_alice",
    emails: ["alice@example.com"],
    email: "alice@example.com",
  },
  bob = { id: "user_bob", emails: ["bob@example.com"] };
const jpeg = () =>
  new File([new Uint8Array([255, 216, 255, 1, 2, 3])], "slab.jpg", {
    type: "image/jpeg",
  });

test("account drafts: private photos, cross-device revisions, expiry, ownership, submission and deletion", async () => {
  const database = new PGlite();
  try {
    await database.exec(
      await readFile(new URL("../scripts/schema.sql", import.meta.url), "utf8"),
    );
    const sql = async (parts, ...values) =>
      (
        await database.query(
          parts.reduce((q, p, i) => q + (i ? "$" + i : "") + p, ""),
          values,
        )
      ).rows;
    sql.query = async (q, p) => (await database.query(q, p)).rows;
    let identity = alice,
      notified = 0;
    const blobs = new Set();
    const deps = {
      sql,
      db: () => sql,
      getIdentity: async () => identity,
      configured: () => true,
      sameOrigin: (r) => r.headers.get("origin") === "https://example.com",
      limited: async () => false,
      after: (fn) => void fn(),
      notifySubmission: async () => {
        notified++;
      },
      put: async (path, bytes, options) => {
        assert.equal(options.access, "private");
        blobs.add(path);
        return { url: path, pathname: path };
      },
      del: async (paths) => {
        for (const path of Array.isArray(paths) ? paths : [paths])
          blobs.delete(path);
      },
    };
    const id = randomUUID(),
      data = {
        ...emptyDraft(),
        id,
        name: "Alice",
        email: "alice@example.com",
        cards: [
          {
            itemType: "Graded card",
            name: "Test collection",
            category: "Pokémon",
            grader: "TAG",
            grade: "9",
            quantity: 1,
            asking: "",
          },
        ],
      };
    const a = await stagePhoto(id, jpeg(), deps, jpeg()),
      b = await stagePhoto(id, jpeg(), deps, jpeg());
    let body = {
      id,
      version: 0,
      data,
      photos: [
        { token: a.token, name: "front.jpg" },
        { token: b.token, name: "back.jpg" },
      ],
    };
    assert.equal((await saveAccountDraft(alice, body, sql)).version, 1);
    assert.equal((await listAccountDrafts(alice, sql)).length, 1);
    assert.equal((await listAccountDrafts(bob, sql)).length, 0);
    const device2 = await readAccountDraft(alice, id, sql);
    assert.equal(device2.photos.length, 2);
    assert.match(device2.photos[0].previewUrl, /api\/account\/drafts\/photo/);
    const preview = await accountDraftPhoto(
      alice,
      id,
      uploadHash(b.token),
      sql,
    );
    assert.match(preview.pathname, /-preview$/);
    await assert.rejects(
      readAccountDraft(bob, id, sql),
      (e) => e.status === 404,
    );
    await assert.rejects(
      accountDraftPhoto(bob, id, uploadHash(b.token), sql),
      (e) => e.status === 404,
    );
    await assert.rejects(
      saveAccountDraft(null, body, sql),
      (e) => e.status === 401,
    );
    await assert.rejects(
      saveAccountDraft({ id: "unverified", emails: [] }, body, sql),
      (e) => e.status === 403,
    );
    await assert.rejects(
      saveAccountDraft(bob, { ...body, version: 1 }, sql),
      (e) => e.status === 409,
    );
    identity = bob;
    await assert.rejects(stagePhoto(id, jpeg(), deps, jpeg()), /belongs/);
    identity = alice;
    body = {
      ...body,
      version: 1,
      photos: [body.photos[1]],
      data: { ...data, notes: "Changed on phone" },
    };
    assert.equal((await saveAccountDraft(alice, body, sql)).version, 2);
    assert.deepEqual(
      await accountDraftPhoto(alice, id, uploadHash(b.token), sql),
      preview,
      "Removing an earlier photo does not change preview identity",
    );
    await assert.rejects(
      accountDraftPhoto(alice, id, uploadHash(a.token), sql),
      (e) => e.status === 404,
    );
    await assert.rejects(
      saveAccountDraft(alice, body, sql),
      (e) => e.status === 409,
    );
    await assert.rejects(
      closeAccountDraft(alice, id, 1, sql),
      (e) => e.status === 409,
    );
    const handler = createAccountDraftHandler(deps);
    const request = (method, body, origin = "https://example.com") =>
      new Request("https://example.com/api/account/drafts", {
        method,
        headers: { origin, "Content-Type": "application/json" },
        ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
      });
    assert.equal(
      (await handler(request("PUT", body, "https://evil.example"))).status,
      403,
    );
    identity = null;
    assert.equal((await handler(request("GET"))).status, 401);
    identity = alice;
    const submit = createSubmissionHandler(deps);
    const submission = (version) => {
      const form = new FormData();
      form.set("data", JSON.stringify({ ...body.data, consent: true }));
      form.set("uploads", JSON.stringify([b.token]));
      form.set("draftVersion", String(version));
      return new Request("https://example.com/api/submissions", {
        method: "POST",
        headers: { origin: "https://example.com" },
        body: form,
      });
    };
    identity = bob;
    assert.equal((await submit(submission(2))).status, 403);
    identity = null;
    assert.equal((await submit(submission(2))).status, 403);
    identity = alice;
    assert.equal((await submit(submission(1))).status, 409);
    assert.equal(
      (await readAccountDraft(alice, id, sql)).version,
      2,
      "Stale submit leaves draft open",
    );
    const response = await submit(submission(2));
    assert.equal(response.status, 201, JSON.stringify(await response.json()));
    assert.equal(
      (
        await sql.query(
          "SELECT customer_user_id,photos FROM submissions WHERE id=$1",
          [id],
        )
      )[0].customer_user_id,
      alice.id,
    );
    assert.equal(notified, 1);
    assert.equal((await submit(submission(2))).status, 200);
    assert.equal(notified, 1);
    assert.equal((await listAccountDrafts(alice, sql)).length, 0);
    await assert.rejects(
      readAccountDraft(alice, id, sql),
      (e) => e.status === 404,
    );
    await assert.rejects(
      saveAccountDraft(alice, { ...body, version: 2 }, sql),
      (e) => e.status === 409,
    );
    const id2 = randomUUID();
    const photo = await stagePhoto(id2, jpeg(), deps, jpeg());
    const second = {
      id: id2,
      version: 0,
      data: { ...emptyDraft(), id: id2 },
      photos: [{ token: photo.token, name: "expired.jpg" }],
    };
    await saveAccountDraft(alice, second, sql);
    await sql.query(
      "UPDATE submission_uploads SET created_at=now()-interval '32 days'",
      [],
    );
    const expired = await readAccountDraft(alice, id2, sql);
    assert.equal(expired.expiredCount, 1);
    assert.equal(expired.photos.length, 0);
    await cleanupUploads(sql, deps.del);
    assert.equal(
      blobs.size,
      2,
      "Accepted main image and thumbnail survive cleanup; all orphan blobs removed",
    );
    await closeAccountDraft(alice, id2, 1, sql);
    await assert.rejects(
      readAccountDraft(alice, id2, sql),
      (e) => e.status === 404,
    );
    await assert.rejects(
      saveAccountDraft(alice, { ...second, version: 1, photos: [] }, sql),
      (e) => e.status === 409,
    );
    const id3 = randomUUID();
    await saveAccountDraft(
      alice,
      { id: id3, version: 0, data: { ...emptyDraft(), id: id3 }, photos: [] },
      sql,
    );
    await sql.query(
      "UPDATE account_drafts SET updated_at=now()-interval '31 days' WHERE id=$1",
      [id3],
    );
    await assert.rejects(
      readAccountDraft(alice, id3, sql),
      (e) => e.status === 404,
    );
  } finally {
    await database.close();
  }
});
