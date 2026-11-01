import test from "node:test";
import assert from "node:assert/strict";
import { restoreDraft, hasDraftContent } from "../lib/draft";
import { requestJSON } from "../lib/request-json";
import { hasOwnerEdits } from "../lib/owner-edits";

const id = "5affbb6e-d6f6-4bcc-8946-31df2ab5d059";
test("owner edit protection recognizes meaningful changes without flagging equivalent currency", () => {
  const selected = {
    offer: "80.00",
    internal_notes: "Private",
    status: "Reviewing",
  };
  const current = { offer: "$80", notes: "Private", status: "Reviewing" };
  assert.equal(hasOwnerEdits(selected, current), false);
  for (const patch of [
    { offer: "" },
    { offer: "bad" },
    { offer: "81" },
    { notes: "Changed" },
    { status: "Closed" },
  ])
    assert.equal(hasOwnerEdits(selected, { ...current, ...patch }), true);
  assert.equal(
    hasOwnerEdits({ ...selected, offer: null }, { ...current, offer: "" }),
    false,
  );
});
test("restored drafts tolerate damaged rows without losing usable contact or item details", () => {
  const restored = restoreDraft(
    JSON.stringify({
      id,
      name: "Seller",
      email: "seller@example.com",
      consent: true,
      website: "bad",
      cards: [
        null,
        "bad",
        { name: "Charizard", grader: "TAG", grade: "9", quantity: "2" },
      ],
    }),
    () => "unused",
  );
  assert.equal(restored.id, id);
  assert.equal(restored.name, "Seller");
  assert.equal(restored.cards.length, 1);
  assert.equal(restored.cards[0].grader, "TAG");
  assert.equal(restored.cards[0].quantity, 2);
  assert.equal(restored.consent, false);
  assert.equal(restored.website, "");
  assert.equal(hasDraftContent(restored), true);
});
test("broken, missing and old draft storage produces a usable incomplete form", () => {
  for (const raw of [
    "{",
    "null",
    "[]",
    JSON.stringify({ cards: [null], name: {} }),
  ]) {
    const draft = restoreDraft(raw, () => id);
    assert.equal(draft.id, id);
    assert.equal(draft.cards.length, 1);
    assert.equal(draft.cards[0].name, "");
    assert.equal(hasDraftContent(draft), false);
  }
  const legacy = restoreDraft(
    JSON.stringify({
      cards: [
        {
          name: "Raw Pikachu",
          itemType: "Raw card",
          condition: "Edge wear",
          quantity: "",
        },
      ],
    }),
    () => id,
  );
  assert.equal(legacy.cards[0].itemType, "Raw card");
  assert.equal(legacy.cards[0].quantity, "");
});
test("request errors preserve session status and give useful feedback for non-JSON or offline failures", async () => {
  await assert.rejects(
    requestJSON(
      "/test",
      {},
      "Please try again.",
      async () => new Response("upstream unavailable", { status: 503 }),
    ),
    /Please try again/,
  );
  await assert.rejects(
    requestJSON("/test", {}, "Fallback", async () =>
      Response.json({ error: "Sign in again." }, { status: 401 }),
    ),
    (e) => e.status === 401 && e.message === "Sign in again.",
  );
  await assert.rejects(
    requestJSON("/test", {}, "Fallback", async () => {
      throw new TypeError("Failed to fetch");
    }),
    /Check your connection/,
  );
  assert.deepEqual(
    await requestJSON("/test", {}, "Fallback", async () =>
      Response.json({ ok: true }),
    ),
    { ok: true },
  );
});
