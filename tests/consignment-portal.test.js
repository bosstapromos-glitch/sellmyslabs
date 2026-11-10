import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  createAdminConsignmentHandler,
  createConsignmentAcceptanceHandler,
} from "../lib/consignment-handler";
import { consignmentToken, consignmentId } from "../lib/consignment-token";
import { purchaseToken } from "../lib/purchase-token";
import { deliverConsignmentEmail } from "../lib/consignment-mail";
import {
  CONSIGNMENT_TERMS,
  consignmentSnapshot,
  remainingConsignmentQuantities,
} from "../lib/consignment-offer";
import { CUSTOMER_REQUEST_SQL, customerRequest } from "../lib/customer-records";

const key = "isolated-consignment-qa-secret-at-least-32-characters";
const card = {
  name: "Test slab",
  category: "Pokémon",
  itemType: "Graded card",
  grader: "TAG",
  grade: "9",
  quantity: 2,
  asking: "100",
};
const input = (id, editVersion, kind, extra = {}) => ({
  id,
  editVersion,
  kind,
  message: "Seller-facing note",
  ...extra,
});
const sale = {
  channel: "eBay",
  lines: [
    {
      itemIndex: 0,
      quantity: 1,
      listingType: "single",
      salePrice: "100",
      marketplaceFees: "15",
    },
  ],
};
test("consignment tokens are purpose-separated and snapshots validate quantity, fees and listing type", () => {
  const id = randomUUID(),
    token = consignmentToken(id, key);
  assert.equal(consignmentId(token, key), id);
  assert.equal(consignmentId(purchaseToken(id, key), key), null);
  assert.equal(consignmentId(token, key + "x"), null);
  const s = {
    id,
    sale_method: "consignment",
    seller_name: "Test Seller",
    cards: [card],
    internal_notes: "DO NOT SHARE",
  };
  const a = consignmentSnapshot(s, input(id, 0, "arrangement"));
  assert.ok(!JSON.stringify(a).includes("DO NOT SHARE"));
  assert.equal(a.rates[2].percent, 87);
  const b = consignmentSnapshot(s, input(id, 0, "sale", sale));
  assert.equal(b.sellerPayoutCents, 7309);
  assert.equal(b.lines[0].percent, 87);
  assert.throws(
    () =>
      consignmentSnapshot(
        s,
        input(id, 0, "sale", {
          ...sale,
          lines: [...sale.lines, ...sale.lines],
        }),
      ),
    /once/,
  );
  assert.throws(
    () =>
      consignmentSnapshot(
        s,
        input(id, 0, "sale", {
          ...sale,
          lines: [{ ...sale.lines[0], quantity: 3 }],
        }),
      ),
    /quantity/,
  );
  assert.throws(
    () =>
      consignmentSnapshot(
        s,
        input(id, 0, "sale", {
          ...sale,
          lines: [{ ...sale.lines[0], quantity: 2 }],
        }),
      ),
    /lot/,
  );
  assert.throws(
    () =>
      consignmentSnapshot(
        s,
        input(id, 0, "sale", {
          ...sale,
          lines: [{ ...sale.lines[0], listingType: "sealed" }],
        }),
      ),
    /sealed/,
  );
  assert.deepEqual(
    remainingConsignmentQuantities(
      [card],
      [{ kind: "sale", accepted_at: "2026-11-10", snapshot: b }],
    ),
    [1],
  );
});

test("real consignment handlers publish, show in account, accept once, replace stale links and reserve approved quantities", async () => {
  const database = new PGlite();
  const priorKey = process.env.SESSION_SECRET,
    priorMail = process.env.RESEND_API_KEY;
  process.env.SESSION_SECRET = key;
  process.env.RESEND_API_KEY = "test-only";
  const sent = [];
  let failMail = false;
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
    const id = randomUUID();
    await sql.query(
      "INSERT INTO submissions(id,seller_name,email,cards,sale_method,customer_user_id) VALUES($1,$2,$3,$4,$5,$6)",
      [
        id,
        "Test Seller",
        "seller@example.com",
        JSON.stringify([card]),
        "consignment",
        "qa_seller",
      ],
    );
    const deps = {
      sql,
      signedIn: async () => true,
      sameOrigin: (r) => r.headers.get("origin") === "https://example.com",
      limited: async () => false,
      mailConfig: () => ({
        from: "shop@example.com",
        replyTo: "owner@example.com",
        site: "https://example.com",
      }),
      deliver: (emailId) =>
        deliverConsignmentEmail(emailId, {
          sql,
          fetchEmail: async (url, opts) => {
            if (failMail) throw Error("Offline");
            sent.push({
              idempotency: opts.headers["Idempotency-Key"],
              payload: JSON.parse(opts.body),
            });
            return Response.json({ id: randomUUID() });
          },
        }),
    };
    const admin = createAdminConsignmentHandler(deps),
      accept = createConsignmentAcceptanceHandler(deps);
    const post = (body, origin = "https://example.com") =>
      admin(
        new Request("https://example.com/api/admin/consignment", {
          method: "POST",
          headers: { origin, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
    const current = async () =>
      (await sql.query("SELECT * FROM submissions WHERE id=$1", [id]))[0];
    const publish = async (kind, extra = {}) =>
      post(input(id, (await current()).edit_version, kind, extra));
    const acceptOffer = (offerId, body = {}, origin = "https://example.com") =>
      accept(
        new Request(
          "https://example.com/api/consignment/" + consignmentToken(offerId),
          {
            method: "POST",
            headers: { origin, "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "Test Seller",
              agree: true,
              termsVersion: CONSIGNMENT_TERMS.version,
              ...body,
            }),
          },
        ),
        { params: Promise.resolve({ token: consignmentToken(offerId) }) },
      );
    assert.equal(
      (
        await createAdminConsignmentHandler({
          ...deps,
          signedIn: async () => false,
        })(new Request("https://example.com/api/admin/consignment?id=" + id))
      ).status,
      401,
    );
    assert.equal(
      (await post(input(id, 0, "arrangement"), "https://evil.example")).status,
      401,
    );
    assert.equal(
      (await publish("sale", sale)).status,
      409,
      "Buyer offer requires accepted arrangement",
    );
    const first = await publish("arrangement");
    assert.equal(first.status, 201, JSON.stringify(await first.clone().json()));
    const arrangement = (await first.json()).id;
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0].payload.bcc, ["owner@example.com"]);
    assert.equal(
      (await acceptOffer(arrangement, { agree: false })).status,
      400,
    );
    assert.equal(
      (await acceptOffer(arrangement, { termsVersion: "wrong" })).status,
      409,
    );
    assert.equal(
      (await acceptOffer(arrangement, {}, "https://evil.example")).status,
      403,
    );
    assert.equal((await acceptOffer(arrangement)).status, 200);
    const again = await acceptOffer(arrangement, { name: "Different name" });
    assert.equal((await again.json()).offer.acceptedName, "Test Seller");
    assert.equal(sent.length, 2, "One notification and one receipt only");
    const row = (await sql.query(CUSTOMER_REQUEST_SQL, ["qa_seller", id]))[0];
    assert.equal(customerRequest(row).consignmentApprovals[0].id, arrangement);
    assert.equal(row.internal_notes, undefined);
    failMail = true;
    const firstSale = await publish("sale", sale);
    assert.equal(
      firstSale.status,
      201,
      JSON.stringify(await firstSale.clone().json()),
    );
    const oldSale = (await firstSale.json()).id;
    const portal = (
      await sql.query(CUSTOMER_REQUEST_SQL, ["qa_seller", id])
    )[0];
    assert.ok(
      customerRequest(portal).consignmentApprovals.some(
        (o) => o.id === oldSale,
      ),
      "Portal offer visible even when notification fails",
    );
    const staleVersion = (await current()).edit_version;
    const revised = await publish("sale", {
      ...sale,
      message: "Updated offer note",
    });
    assert.equal(revised.status, 201);
    const revisedId = (await revised.json()).id;
    assert.equal(
      (await acceptOffer(oldSale)).status,
      409,
      "Old link cannot accept replacement",
    );
    assert.equal(
      (await post(input(id, staleVersion, "sale", sale))).status,
      409,
      "A stale owner tab cannot duplicate publication",
    );
    const { PENDING_CONSIGNMENT_EMAILS_SQL } = await import(
      "../lib/consignment-records"
    );
    const retryable = await sql.query(PENDING_CONSIGNMENT_EMAILS_SQL, []);
    const outdatedEmails = await sql.query(
      "SELECT id FROM consignment_emails WHERE offer_id=$1",
      [oldSale],
    );
    assert.ok(
      !retryable.some((e) => outdatedEmails.some((old) => old.id === e.id)),
      "Replaced notifications cannot starve the retry queue",
    );
    const otherAccount = await sql.query(CUSTOMER_REQUEST_SQL, [
      "other_customer",
      id,
    ]);
    assert.equal(
      otherAccount.length,
      0,
      "Another customer cannot retrieve the approval through their account",
    );
    failMail = false;
    assert.equal((await acceptOffer(revisedId)).status, 200);
    assert.equal((await current()).status, "Offer approved");
    const listing = await admin(
      new Request("https://example.com/api/admin/consignment?id=" + id),
    );
    const history = await listing.json();
    assert.deepEqual(history.remaining, [1]);
    const invalidQuantity = {
      ...sale,
      lines: [{ ...sale.lines[0], quantity: 2, listingType: "lot" }],
    };
    assert.equal(
      (await publish("sale", invalidQuantity)).status,
      400,
      "Already-approved units cannot be resold",
    );
    const next = await publish("sale", sale);
    assert.equal(next.status, 201);
    const nextId = (await next.json()).id;
    const replaceArrangement = await publish("arrangement");
    assert.equal(replaceArrangement.status, 201);
    assert.equal(
      (await acceptOffer(nextId)).status,
      409,
      "New arrangement withdraws pending buyer offer",
    );
    assert.equal(
      (await publish("sale", sale)).status,
      409,
      "Revised arrangement needs acceptance",
    );
    const acceptedRecord = await accept(
      new Request(
        "https://example.com/api/consignment/" + consignmentToken(revisedId),
      ),
      { params: Promise.resolve({ token: consignmentToken(revisedId) }) },
    );
    const record = (await acceptedRecord.json()).offer;
    assert.equal(record.snapshot.sellerPayoutCents, 7309);
    assert.equal(record.acceptedName, "Test Seller");
    assert.equal(record.email, undefined);
    const newArrangement = (await replaceArrangement.json()).id;
    await sql.query("UPDATE submissions SET status='Closed' WHERE id=$1", [id]);
    assert.equal(
      (await acceptOffer(newArrangement)).status,
      409,
      "Closed requests cannot be accepted",
    );
    const receipts = await sql.query(
      "SELECT * FROM consignment_emails WHERE kind='acceptance'",
      [],
    );
    assert.equal(receipts.length, 2);
    assert.equal(new Set(receipts.map((r) => r.offer_id)).size, 2);
  } finally {
    await database.close();
    if (priorKey === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorKey;
    if (priorMail === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = priorMail;
  }
});

test("acceptance states cannot be fabricated through manual status edits", async () => {
  const { canSetConsignmentStatus } = await import("../lib/sale-method");
  assert.equal(canSetConsignmentStatus("Offer approved", "Reviewing"), false);
  assert.equal(canSetConsignmentStatus("Agreed", "New"), false);
  assert.equal(canSetConsignmentStatus("Agreement sent", "New"), false);
  assert.equal(canSetConsignmentStatus("Buyer offer sent", "Listed"), false);
  assert.equal(
    canSetConsignmentStatus("Offer approved", "Offer approved"),
    true,
  );
  assert.equal(canSetConsignmentStatus("Closed", "Buyer offer sent"), true);
});
