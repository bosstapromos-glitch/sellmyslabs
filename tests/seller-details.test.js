import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { submissionSchema } from "../lib/validation";
import { stepErrors } from "../lib/sell-validation";
import { emptyDraft, emptyCard, restoreDraft, hasDraftContent } from "../lib/draft";
import { createSubmissionHandler } from "../lib/submission-handler";
import { stagePhoto } from "../lib/submission-uploads";

const id = "1affbb6e-d6f6-4bcc-8946-31df2ab5d059";
const slab = { ...emptyCard(), itemType: "Graded card", name: "Charizard ex", category: "Pokémon", grader: "PSA", grade: "10" };
const seller = {
  ...emptyDraft(),
  id,
  name: "Sam Seller",
  email: "sam@example.com",
  phone: "(208) 555-0100",
  city: "Twin Falls",
  state: "ID",
  zip: "83301",
  cards: [slab],
  consent: true,
};

test("a phone number with area code is required; the form also requires city, state and ZIP", () => {
  assert.deepEqual(stepErrors(seller, 1, 1), {});
  for (const phone of ["", "555-0100", "call me", "1".repeat(16)])
    assert.match(stepErrors({ ...seller, phone }, 1, 1).phone, /area code/);
  for (const phone of ["2085550100", "+1 (208) 555-0100", "208.555.0100 ext 4"])
    assert.equal(stepErrors({ ...seller, phone }, 1, 1).phone, undefined);
  const blank = stepErrors({ ...seller, city: " ", state: "", zip: "" }, 1, 1);
  assert.deepEqual(Object.keys(blank).sort(), ["city", "state", "zip"]);
  assert.match(stepErrors({ ...seller, zip: "!!" }, 1, 1).zip, /ZIP or postal code/);
  assert.equal(stepErrors({ ...seller, zip: "83301-1234" }, 1, 1).zip, undefined);
  assert.ok(stepErrors({ ...seller, contactMethod: "fax" }, 1, 1).contactMethod);
});

test("a tab opened before the new fields existed can still send, and gets no marketing opt-in", () => {
  const { contactMethod, city, state, zip, marketingEmail, marketingText, ...older } = seller;
  const parsed = submissionSchema.parse(older);
  assert.deepEqual(
    [parsed.contactMethod, parsed.city, parsed.zip, parsed.marketingEmail, parsed.marketingText],
    ["email", "", "", false, false],
  );
});

test("a saved draft keeps contact details but never restores a marketing tick", () => {
  const restored = restoreDraft(
    JSON.stringify({ ...seller, contactMethod: "text", marketingEmail: true, marketingText: true }),
    () => id,
  );
  assert.deepEqual(
    [restored.contactMethod, restored.city, restored.state, restored.zip],
    ["text", "Twin Falls", "ID", "83301"],
  );
  assert.deepEqual([restored.marketingEmail, restored.marketingText], [false, false]);
  assert.equal(restoreDraft(JSON.stringify({ ...seller, contactMethod: "fax" }), () => id).contactMethod, "email");
  assert.equal(hasDraftContent({ ...emptyDraft(), zip: "83301" }), true);
});

test("the stored request records location, contact preference and when each marketing opt-in was given", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile(new URL("../scripts/schema.sql", import.meta.url), "utf8"));
    const sql = async (parts, ...values) =>
      (await db.query(parts.reduce((text, part, i) => text + (i ? "$" + i : "") + part, ""), values)).rows;
    sql.query = async (q, p) => (await db.query(q, p)).rows;
    const put = async (path) => ({ url: "https://test.private.blob.vercel-storage.com/" + path, pathname: path });
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
    const send = async (data) => {
      const photo = new File([new Uint8Array([255, 216, 255, 1])], "slab.jpg", { type: "image/jpeg" });
      const { token } = await stagePhoto(data.id, photo, { sql, put, del: async () => {} });
      const body = new FormData();
      body.set("data", JSON.stringify(data));
      body.set("uploads", JSON.stringify([token]));
      return submit(new Request("https://www.sellmyslabs.net/api/submissions", { method: "POST", body }));
    };
    const before = Date.now();
    const response = await send({ ...seller, contactMethod: "text", marketingText: true });
    assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
    const [row] = await sql.query("SELECT phone,seller_details FROM submissions WHERE id=$1", [id]);
    const details = row.seller_details;
    assert.deepEqual(
      [row.phone, details.contactMethod, details.city, details.state, details.zip, details.marketingEmailAt],
      ["(208) 555-0100", "text", "Twin Falls", "ID", "83301", null],
    );
    assert.ok(new Date(details.marketingTextAt).getTime() >= before);

    const refused = await send({ ...seller, id: "2affbb6e-d6f6-4bcc-8946-31df2ab5d059", phone: "" });
    assert.equal(refused.status, 400);
    assert.match((await refused.json()).error, /phone number/);
  } finally {
    await db.close();
  }
});
