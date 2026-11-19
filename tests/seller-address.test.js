import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { purchaseSnapshot, PURCHASE_TERMS } from "../lib/purchase-terms";
import { purchaseToken } from "../lib/purchase-token";
import { createPurchaseOfferHandler } from "../lib/purchase-handler";
import { PURCHASE_HISTORY_SQL } from "../lib/purchase-records";
import { SAVE_OFFER_SQL } from "../lib/offer-records";
import {
  needsSellerAddress,
  sellerAddressSchema,
  addressLines,
} from "../lib/seller-address";

const address = { street: "123 Main St", unit: "Apt 4", city: "Twin Falls", state: "ID", zip: "83301" };

test("an address is needed from $500 up, and must be complete", () => {
  assert.deepEqual([needsSellerAddress("499.99"), needsSellerAddress("500"), needsSellerAddress(1200)], [false, true, true]);
  assert.deepEqual(sellerAddressSchema.parse({ ...address, unit: undefined }).unit, "");
  for (const bad of [undefined, {}, { ...address, street: "" }, { ...address, city: " " }, { ...address, zip: "?" }, { ...address, street: "1\n2 Main" }])
    assert.equal(sellerAddressSchema.safeParse(bad).success, false);
  assert.deepEqual(addressLines(address), ["123 Main St, Apt 4", "Twin Falls, ID 83301"]);
  assert.deepEqual(addressLines(null), []);
});

test("accepting an offer of $500 or more requires a mailing address, stores it, and shows it to the owner but not on the public offer", async () => {
  const db = new PGlite(),
    oldKey = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "seller-address-qa-only-secret-at-least-32-characters";
  try {
    await db.exec(await readFile(new URL("../scripts/schema.sql", import.meta.url), "utf8"));
    const sql = { query: async (q, p) => (await db.query(q, p)).rows };
    const publish = async (price) => {
      const id = randomUUID();
      await sql.query("INSERT INTO submissions(id,seller_name,email,cards) VALUES($1,$2,$3,$4)", [
        id,
        "QA Seller",
        "seller@example.com",
        JSON.stringify([{ name: "QA slab", grader: "TAG", grade: "9", quantity: 1 }]),
      ]);
      const [s] = await sql.query("SELECT * FROM submissions WHERE id=$1", [id]);
      const [saved] = await sql.query(SAVE_OFFER_SQL, [
        id, s.status, "Private", price, s.offer_version, randomUUID(),
        JSON.stringify({ to: ["seller@example.com"] }), "", "[]",
        JSON.stringify(purchaseSnapshot(s, price)), false, s.edit_version,
      ]);
      await sql.query("UPDATE offer_emails SET status='sent' WHERE id=$1", [saved.queued_email]);
      return { id, offer: saved.queued_email };
    };
    const receipts = [];
    const handlers = createPurchaseOfferHandler({
      sql,
      sameOrigin: () => true,
      limited: async () => false,
      mailConfig: () => ({ from: "shop@example.com", replyTo: "owner@example.com", site: "https://example.com", enabled: true }),
      deliver: async () => {},
    });
    const accept = (offer, body = {}) => {
      const token = purchaseToken(offer);
      return handlers.POST(
        new Request("https://example.com/api/offers/" + token, {
          method: "POST",
          body: JSON.stringify({ name: "Quinn A. Seller", agree: true, termsVersion: PURCHASE_TERMS.version, ...body }),
        }),
        { params: Promise.resolve({ token }) },
      );
    };

    const small = await publish("499.99");
    const smallResult = await accept(small.offer);
    assert.equal(smallResult.status, 200, "Under $500 nothing extra is asked");
    assert.equal((await smallResult.json()).offer.requiresAddress, false);

    const large = await publish("500");
    const view = await handlers.GET(null, { params: Promise.resolve({ token: purchaseToken(large.offer) }) });
    assert.equal((await view.json()).offer.requiresAddress, true);
    const missing = await accept(large.offer);
    assert.equal(missing.status, 400);
    assert.match((await missing.json()).error, /legal name and mailing address/);
    const partial = await accept(large.offer, { address: { ...address, zip: "" } });
    assert.equal(partial.status, 400);
    assert.match((await partial.json()).error, /ZIP/);
    assert.equal(
      (await sql.query("SELECT accepted_at FROM offer_emails WHERE id=$1", [large.offer]))[0].accepted_at,
      null,
      "A refused acceptance records nothing",
    );

    const done = await accept(large.offer, { address });
    assert.equal(done.status, 200);
    const shown = (await done.json()).offer;
    assert.equal(shown.acceptedName, "Quinn A. Seller");
    assert.ok(!JSON.stringify(shown).includes("123 Main St"), "The private offer page does not echo the address back");
    const [record] = await sql.query(PURCHASE_HISTORY_SQL, [large.id]);
    assert.deepEqual(record.accepted_details, address);
    const [receipt] = await sql.query("SELECT payload FROM purchase_receipts WHERE offer_id=$1", [large.offer]);
    assert.match(receipt.payload.text, /Mailing address: 123 Main St, Apt 4, Twin Falls, ID 83301/);
    const [smallReceipt] = await sql.query("SELECT payload FROM purchase_receipts WHERE offer_id=$1", [small.offer]);
    assert.ok(!/Mailing address/.test(smallReceipt.payload.text));
  } finally {
    process.env.SESSION_SECRET = oldKey;
    await db.close();
  }
});
