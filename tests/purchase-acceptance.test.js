import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  purchaseSnapshot,
  purchaseRecordText,
  PURCHASE_TERMS,
} from "../lib/purchase-terms";
import { purchaseToken, purchaseId } from "../lib/purchase-token";
import {
  ACCEPT_PURCHASE_SQL,
  PURCHASE_OFFER_SQL,
  publicPurchaseOffer,
} from "../lib/purchase-records";
import {
  purchaseReceiptMessage,
  deliverPurchaseReceipt,
} from "../lib/purchase-receipts";
import { SAVE_OFFER_SQL } from "../lib/offer-records";
import { offerMessage } from "../lib/offer-message";
import { updateSchema } from "../lib/validation";

const secret = "test-only-purchase-signature-key-32-characters";
const seller = {
  id: randomUUID(),
  seller_name: "QA Seller",
  email: "seller@example.com",
  internal_notes: "PRIVATE NEVER SEND",
  phone: "PRIVATE PHONE",
  offer_message: "A note explaining the collection price.",
  cards: [
    {
      name: "QA slab",
      grader: "TAG",
      grade: "9",
      cert: "QA123",
      quantity: 2,
      asking: "999",
    },
    {
      name: "QA raw card",
      itemType: "Raw card",
      condition: "Edge wear",
      quantity: 1,
    },
    {
      name: "QA sealed box",
      itemType: "Sealed product",
      condition: "Unopened",
      quantity: 1,
    },
  ],
};
const config = {
  from: "requests@example.com",
  replyTo: "owner@example.com",
  site: "https://example.com",
};

test("private offer links cannot be changed to another offer or used with another signing key", () => {
  const id = randomUUID();
  const token = purchaseToken(id, secret);
  assert.equal(purchaseId(token, secret), id);
  assert.equal(purchaseId(token, secret + "wrong"), null);
  assert.equal(
    purchaseId(`${randomUUID()}.${token.split(".")[1]}`, secret),
    null,
  );
  for (const bad of [
    "",
    id,
    token + ".extra",
    token.slice(0, -1),
    `${id}.${"é".repeat(43)}`,
  ])
    assert.equal(purchaseId(bad, secret), null);
  assert.throws(() => purchaseToken(id, "short"), /not configured/);
});

test("purchase copies preserve the exact collection, terms and statement without private notes or asking prices", () => {
  const snapshot = purchaseSnapshot(seller, "80");
  const record = purchaseRecordText(snapshot);
  assert.match(record, /\$80.00/);
  assert.match(record, /TAG 9 · Qty 2 · Cert QA123/);
  assert.match(record, /72 hours/);
  assert.match(record, /initiate payment the same day/);
  assert.match(record, /ACH, wire, Zelle, Cash App or Venmo/);
  assert.match(record, /seller pays return shipping/);
  assert.ok(!record.includes("PRIVATE"));
  assert.ok(!record.includes("999"));
  const receipt = purchaseReceiptMessage(
    { purchase_snapshot: snapshot, recipients: [seller.email] },
    "QA Signer",
    "2026-11-01T20:00:00.000Z",
    { ...config, url: "https://example.com/offer/test" },
  );
  assert.deepEqual(receipt.to, [seller.email]);
  assert.deepEqual(receipt.bcc, [config.replyTo]);
  assert.ok(receipt.text.includes(snapshot.statement));
  for (const section of snapshot.terms.sections)
    assert.ok(receipt.text.includes(section.text));
  assert.equal(
    purchaseReceiptMessage(
      { purchase_snapshot: snapshot, recipients: [config.replyTo] },
      "Owner",
      "2026-11-01",
      { ...config, url: "https://example.com" },
    ).bcc,
    undefined,
  );
  snapshot.terms.sections[0].text = "Edited copy";
  assert.notEqual(PURCHASE_TERMS.sections[0].text, "Edited copy");
  const email = offerMessage(seller, "80", {
    ...config,
    acceptanceUrl: "https://example.com/offer/private",
  });
  assert.match(email.text, /Review the listed items and Purchase Terms/);
  assert.match(email.text, /https:\/\/example.com\/offer\/private/);
  assert.ok(!email.text.includes("PRIVATE NEVER SEND"));
});

test("owner updates require a valid edit version and an explicit boolean when requesting terms", () => {
  const base = { id: seller.id, status: "Offer ready", notes: "", offer: "80" };
  assert.equal(updateSchema.parse(base).editVersion, 0);
  assert.equal(updateSchema.parse(base).requestAcceptance, false);
  for (const editVersion of [-1, null, "0", 0.5])
    assert.equal(
      updateSchema.safeParse({ ...base, editVersion }).success,
      false,
    );
  assert.equal(
    updateSchema.safeParse({ ...base, requestAcceptance: "true" }).success,
    false,
  );
});

test("acceptance is atomic, immutable and idempotent; stale links and owner saves cannot replace it", async () => {
  const db = new PGlite();
  const sql = async (strings, ...params) =>
    (
      await db.query(
        strings.reduce((q, part, i) => q + (i ? `$${i}` : "") + part, ""),
        params,
      )
    ).rows;
  sql.query = async (query, params) => (await db.query(query, params)).rows;
  const originalKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "test-only";
  try {
    const schema = await readFile(
      new URL("../scripts/schema.sql", import.meta.url),
      "utf8",
    );
    await db.exec(schema);
    await db.exec(schema);
    await db.query(
      "INSERT INTO submissions(id,seller_name,email,cards) VALUES($1,$2,$3,$4)",
      [
        seller.id,
        seller.seller_name,
        seller.email,
        JSON.stringify(seller.cards),
      ],
    );
    const current = async () =>
      (await db.query("SELECT * FROM submissions WHERE id=$1", [seller.id]))
        .rows[0];
    const offer = async (id) =>
      (await db.query(PURCHASE_OFFER_SQL, [id])).rows[0];
    const save = async ({
      price = "80",
      force = false,
      expected,
      state = "Offer ready",
      snapshot = purchaseSnapshot(seller, price),
      message = seller.offer_message,
    } = {}) => {
      const row = expected || (await current());
      const id = randomUUID();
      return (
        await db.query(SAVE_OFFER_SQL, [
          seller.id,
          state,
          "PRIVATE NEVER SEND",
          price,
          row.offer_version,
          id,
          JSON.stringify(
            offerMessage(seller, price, {
              ...config,
              acceptanceUrl: `https://example.com/offer/${purchaseToken(id, secret)}`,
            }),
          ),
          message,
          "[]",
          snapshot ? JSON.stringify(snapshot) : null,
          force,
          row.edit_version,
        ])
      ).rows[0];
    };
    const first = await save();
    const ownerBeforeAcceptance = await current();
    const before = await offer(first.queued_email);
    const copy = purchaseReceiptMessage(
      before,
      "QA Signer",
      "2026-11-01T20:00:00.000Z",
      { ...config, url: "https://example.com/offer/test" },
    );
    const accept = async (id, name = "QA Signer") =>
      (
        await db.query(ACCEPT_PURCHASE_SQL, [
          id,
          name,
          "2026-11-01T20:00:00.000Z",
          JSON.stringify(copy),
        ])
      ).rows;
    assert.equal((await accept(first.queued_email)).length, 1);
    assert.equal((await current()).status, "Agreed");
    assert.equal(
      (await current()).edit_version,
      ownerBeforeAcceptance.edit_version + 1,
    );
    assert.equal((await accept(first.queued_email, "Someone else")).length, 0);
    assert.equal((await offer(first.queued_email)).accepted_name, "QA Signer");
    assert.equal(
      (await db.query("SELECT * FROM purchase_receipts")).rows.length,
      1,
    );
    assert.equal(
      await save({ expected: ownerBeforeAcceptance }),
      undefined,
      "A stale owner tab must not overwrite acceptance",
    );
    const publicRecord = publicPurchaseOffer(await offer(first.queued_email));
    assert.equal(publicRecord.canAccept, false);
    assert.equal(publicRecord.recipients, undefined);
    assert.ok(!JSON.stringify(publicRecord).includes("PRIVATE"));
    const revised = await save({ price: "85", state: "Agreed" });
    assert.equal(revised.status, "Offer ready");
    assert.equal((await offer(first.queued_email)).is_current, false);
    assert.equal(
      (await offer(first.queued_email)).purchase_snapshot.amount,
      "80.00",
    );
    assert.equal((await offer(first.queued_email)).accepted_name, "QA Signer");
    const newer = await save({ price: "90" });
    assert.equal(
      (await accept(revised.queued_email)).length,
      0,
      "Superseded unaccepted links cannot be accepted",
    );
    await save({ price: "90", state: "Closed" });
    assert.equal(
      (await accept(newer.queued_email)).length,
      0,
      "Closed requests cannot be accepted",
    );
    await save({ price: "90", state: "Offer ready" });
    const forced = await save({ price: "90", force: true });
    assert.ok(
      forced.queued_email,
      "Legacy offers can explicitly email a terms-enabled version at the same price",
    );
    assert.equal((await accept(newer.queued_email)).length, 0);
    const calls = [];
    await deliverPurchaseReceipt(first.queued_email, {
      sql,
      fetchEmail: async (_url, options) => {
        calls.push(options);
        throw new Error("Interrupted");
      },
    });
    assert.equal(
      (
        await db.query(
          "SELECT status FROM purchase_receipts WHERE offer_id=$1",
          [first.queued_email],
        )
      ).rows[0].status,
      "failed",
    );
    assert.ok(
      (await offer(first.queued_email)).accepted_at,
      "An email failure does not undo acceptance",
    );
    await deliverPurchaseReceipt(first.queued_email, {
      sql,
      fetchEmail: async (_url, options) => {
        calls.push(options);
        return Response.json({ id: "test-provider-id" });
      },
    });
    assert.equal(
      calls[0].headers["Idempotency-Key"],
      calls[1].headers["Idempotency-Key"],
    );
    assert.equal(calls[0].body, calls[1].body);
    await deliverPurchaseReceipt(first.queued_email, {
      sql,
      fetchEmail: async () => assert.fail("Must not send a receipt twice"),
    });
    assert.equal(
      publicPurchaseOffer(await offer(first.queued_email)).receiptSent,
      true,
    );
  } finally {
    await db.close();
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  }
});
