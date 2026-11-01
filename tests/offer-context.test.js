import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { prepareOfferPhotos, offerPhotoSummary } from "../lib/offer-photos";
import { offerMessage } from "../lib/offer-message";
import { SAVE_OFFER_SQL, CLAIM_OFFER_SQL } from "../lib/offer-records";
import { hasOwnerEdits, hasSellerContextEdits } from "../lib/owner-edits";
import { updateSchema } from "../lib/validation";

const image = () =>
  new File([Buffer.from([255, 216, 255, 224, 0, 4, 1, 2])], "sale.jpg", {
    type: "image/jpeg",
  });
const seller = {
  id: randomUUID(),
  seller_name: "QA Seller",
  email: "seller@example.com",
  internal_notes: "PRIVATE NEVER SEND",
  cards: [{ name: "Test card", grader: "PSA", grade: "9", quantity: 1 }],
};
const config = {
  from: "requests@example.com",
  replyTo: "owner@example.com",
  site: "https://example.com",
};

test("sales photos validate bytes, limits and retained ownership; summaries omit image content", async () => {
  const photos = await prepareOfferPhotos([], [], [image(), image()]);
  assert.equal(photos.length, 1, "Identical photos are not duplicated");
  assert.equal(photos[0].type, "image/jpeg");
  assert.equal(Buffer.from(photos[0].content, "base64").length, 8);
  assert.equal(offerPhotoSummary(photos)[0].content, undefined);
  assert.deepEqual(
    await prepareOfferPhotos(photos, undefined),
    photos,
    "Older clients preserve saved photos",
  );
  assert.deepEqual(await prepareOfferPhotos(photos, []), []);
  await assert.rejects(prepareOfferPhotos(photos, ["f".repeat(64)]), /changed/);
  await assert.rejects(
    prepareOfferPhotos([], [], [image(), image(), image(), image()]),
    /up to 3/,
  );
  await assert.rejects(
    prepareOfferPhotos(
      [],
      [],
      [new File(["<svg></svg>"], "fake.jpg", { type: "image/jpeg" })],
    ),
    /JPG/,
  );
  await assert.rejects(
    prepareOfferPhotos(
      [],
      [],
      [new File([new Uint8Array(350001)], "large.jpg")],
    ),
    /too large/,
  );
});

test("seller context and photo attachments are included in the email but private notes are excluded", async () => {
  const offer_photos = await prepareOfferPhotos([], [], [image()]);
  const payload = offerMessage(
    {
      ...seller,
      offer_message: "Recent sales and edge wear informed this price.",
      offer_photos,
    },
    "80",
    config,
  );
  assert.match(
    payload.text,
    /A note about your offer:\nRecent sales and edge wear/,
  );
  assert.match(payload.text, /Attached: 1 sales photo for reference/);
  assert.deepEqual(payload.attachments, [
    { filename: offer_photos[0].filename, content: offer_photos[0].content },
  ]);
  assert.deepEqual(payload.bcc, ["owner@example.com"]);
  assert.ok(!JSON.stringify(payload).includes("PRIVATE NEVER SEND"));
  assert.equal(offerMessage(seller, "80", config).attachments, undefined);
});

test("seller-facing changes are dirty and bounded while equivalent text and unchanged photos are not", () => {
  const selected = {
    offer: "80",
    status: "Offer ready",
    internal_notes: "private",
    offer_message: "Context",
    offer_photos: [{ id: "a".repeat(64) }],
  };
  const context = {
    sellerMessage: " Context ",
    offerPhotos: selected.offer_photos,
    newOfferPhotos: [],
  };
  assert.equal(hasSellerContextEdits(selected, context), false);
  assert.equal(
    hasOwnerEdits(selected, {
      offer: "80.00",
      status: selected.status,
      notes: "private",
      ...context,
    }),
    false,
  );
  assert.equal(
    hasSellerContextEdits(selected, {
      ...context,
      sellerMessage: "Revised context",
    }),
    true,
  );
  assert.equal(
    hasSellerContextEdits(selected, { ...context, offerPhotos: [] }),
    true,
  );
  assert.equal(
    hasSellerContextEdits(selected, { ...context, newOfferPhotos: [image()] }),
    true,
  );
  const base = { id: seller.id, status: "New", notes: "", offer: "80" };
  assert.equal(
    updateSchema.parse(base).sellerMessage,
    undefined,
    "Older clients do not clear the message",
  );
  assert.equal(
    updateSchema.safeParse({ ...base, sellerMessage: "a".repeat(3001) })
      .success,
    false,
  );
});

test("same-price message/photo updates create immutable emails; private saves and duplicate submissions do not", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(new URL("../scripts/schema.sql", import.meta.url), "utf8"),
    );
    await db.query(
      "INSERT INTO submissions(id,seller_name,email,cards) VALUES($1,$2,$3,$4)",
      [
        seller.id,
        seller.seller_name,
        seller.email,
        JSON.stringify(seller.cards),
      ],
    );
    const photos = await prepareOfferPhotos([], [], [image()]);
    const save = async (
      version,
      message,
      photos,
      amount = "80",
      notes = "private",
    ) => {
      const payload = amount
        ? offerMessage(
            { ...seller, offer_message: message, offer_photos: photos },
            amount,
            config,
          )
        : null;
      return (
        await db.query(SAVE_OFFER_SQL, [
          seller.id,
          "Offer ready",
          notes,
          amount,
          version,
          randomUUID(),
          JSON.stringify(payload),
          message,
          JSON.stringify(photos),
          null,
          false,
          null,
        ])
      ).rows[0];
    };
    const draft = await save(0, "Draft context", photos, null);
    assert.equal(draft.queued_email, null);
    assert.equal(draft.offer_photos.length, 1);
    const first = await save(draft.offer_version, "First explanation", photos);
    assert.ok(first.queued_email);
    const privateSave = await save(
      first.offer_version,
      "First explanation",
      photos,
      "80",
      "changed private notes",
    );
    assert.equal(privateSave.queued_email, null);
    const revised = await save(
      first.offer_version,
      "Updated explanation",
      photos,
    );
    assert.ok(revised.queued_email);
    assert.equal(revised.offer_version, first.offer_version + 1);
    assert.equal(
      await save(first.offer_version, "Stale update", []),
      undefined,
    );
    assert.equal(
      (await db.query(CLAIM_OFFER_SQL, [first.queued_email, randomUUID()])).rows
        .length,
      0,
      "Do not send superseded content",
    );
    const original = (
      await db.query("SELECT payload FROM offer_emails WHERE id=$1", [
        first.queued_email,
      ])
    ).rows[0].payload;
    assert.match(original.text, /First explanation/);
    assert.equal(original.attachments[0].content, photos[0].content);
    const removed = await save(
      revised.offer_version,
      "Updated explanation",
      [],
    );
    assert.ok(
      removed.queued_email,
      "Removing a sales photo sends the revised offer",
    );
    assert.equal(
      (await save(removed.offer_version, "Updated explanation", []))
        .queued_email,
      null,
    );
  } finally {
    await db.close();
  }
});
