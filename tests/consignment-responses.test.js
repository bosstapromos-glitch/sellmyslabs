import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  createAdminConsignmentHandler,
  createConsignmentAcceptanceHandler,
} from "../lib/consignment-handler";
import { consignmentToken } from "../lib/consignment-token";
import { CONSIGNMENT_TERMS } from "../lib/consignment-offer";
import { PENDING_CONSIGNMENT_EMAILS_SQL } from "../lib/consignment-records";
import { CUSTOMER_REQUEST_SQL } from "../lib/customer-records";
import { canSetConsignmentStatus } from "../lib/sale-method";

test("seller responses are immutable, visible in both portals and require a revised offer before acceptance", async () => {
  const previous = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET =
    "isolated-response-test-secret-at-least-32-characters";
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(new URL("../scripts/schema.sql", import.meta.url), "utf8"),
    );
    const sql = async (parts, ...values) =>
      (
        await db.query(
          parts.reduce((q, p, i) => q + (i ? "$" + i : "") + p, ""),
          values,
        )
      ).rows;
    sql.query = async (q, p) => (await db.query(q, p)).rows;
    const id = randomUUID();
    await sql.query(
      "INSERT INTO submissions(id,seller_name,email,cards,sale_method,customer_user_id) VALUES($1,$2,$3,$4,$5,$6)",
      [
        id,
        "Test Seller",
        "seller@example.com",
        JSON.stringify([
          {
            name: "Test slab",
            itemType: "Graded card",
            grader: "TAG",
            grade: "9",
            quantity: 2,
            asking: "100",
          },
        ]),
        "consignment",
        "test_seller",
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
      deliver: async () => {
        throw Error("Email offline");
      },
    };
    const admin = createAdminConsignmentHandler(deps),
      customer = createConsignmentAcceptanceHandler(deps);
    const current = async () =>
      (await sql.query("SELECT * FROM submissions WHERE id=$1", [id]))[0];
    const history = async () =>
      await (
        await admin(
          new Request("https://example.com/api/admin/consignment?id=" + id),
        )
      ).json();
    const publish = async (kind, extra = {}) => {
      const result = await admin(
        new Request("https://example.com/api/admin/consignment", {
          method: "POST",
          headers: { origin: "https://example.com" },
          body: JSON.stringify({
            id,
            editVersion: (await current()).edit_version,
            kind,
            ...extra,
          }),
        }),
      );
      assert.equal(
        result.status,
        201,
        JSON.stringify(await result.clone().json()),
      );
      return (await result.json()).id;
    };
    const respond = async (
      offerId,
      body = {},
      origin = "https://example.com",
    ) =>
      customer(
        new Request(
          "https://example.com/api/consignment/" + consignmentToken(offerId),
          {
            method: "POST",
            headers: { origin },
            body: JSON.stringify({
              name: "Test Seller",
              termsVersion: CONSIGNMENT_TERMS.version,
              ...body,
            }),
          },
        ),
        { params: Promise.resolve({ token: consignmentToken(offerId) }) },
      );
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
    const counter = {
      action: "counter",
      note: "Could we try $120?",
      prices: [{ itemIndex: 0, salePrice: "120" }],
    };
    const first = await publish("arrangement");
    assert.equal(
      (await respond(first, counter)).status,
      400,
      "No price counter on arrangement",
    );
    assert.equal(
      (await respond(first, { action: "changes", note: "  " })).status,
      400,
    );
    assert.equal(
      (
        await respond(
          first,
          { action: "changes", note: "Please confirm asking prices." },
          "https://evil.example",
        )
      ).status,
      403,
    );
    const changed = await respond(first, {
      action: "changes",
      note: "Please confirm asking prices.",
    });
    assert.equal(changed.status, 200);
    const changes = (await changed.json()).offer;
    assert.equal(changes.response.action, "changes");
    assert.equal(changes.canAccept, false);
    assert.equal(changes.responseReceiptSent, false);
    assert.equal((await current()).status, "Changes requested");
    assert.equal(
      (await respond(first, { agree: true })).status,
      409,
      "Response cannot later become acceptance",
    );
    assert.equal(
      (await respond(first, { action: "decline" })).status,
      409,
      "Decision cannot be replaced",
    );
    const second = await publish("arrangement");
    assert.equal(
      (
        await respond(second, {
          action: "decline",
          note: "Timing does not work.",
        })
      ).status,
      200,
    );
    assert.equal((await current()).status, "Seller declined");
    const third = await publish("arrangement");
    assert.equal((await respond(third, { agree: true })).status, 200);
    assert.equal(
      (await respond(third, { action: "decline" })).status,
      409,
      "Accepted arrangement cannot be declined through a response",
    );
    const buyer = await publish("sale", sale);
    for (const body of [
      { ...counter, prices: [] },
      { ...counter, prices: [{ itemIndex: 1, salePrice: "120" }] },
      { ...counter, prices: [...counter.prices, ...counter.prices] },
      { ...counter, prices: [{ itemIndex: 0, salePrice: "100" }] },
      { ...counter, prices: [{ itemIndex: 0, salePrice: "10" }] },
      { ...counter, prices: [{ itemIndex: 0, salePrice: "abc" }] },
      { ...counter, note: "x".repeat(2001) },
      { action: "changes", note: "Change sale price" },
    ])
      assert.equal(
        (await respond(buyer, body)).status,
        400,
        JSON.stringify(body),
      );
    assert.equal(
      (await respond(buyer, { ...counter, termsVersion: "wrong" })).status,
      409,
    );
    const response = await respond(buyer, counter);
    assert.equal(
      response.status,
      200,
      JSON.stringify(await response.clone().json()),
    );
    const saved = (await response.json()).offer;
    assert.equal(saved.response.lines[0].saleCents, 12000);
    assert.equal(saved.response.sellerPayoutCents, 9049);
    assert.equal(saved.response.lines[0].quantity, 1);
    assert.equal(saved.acceptedAt, null);
    assert.equal((await current()).status, "Counter received");
    assert.equal(
      (await respond(buyer, counter)).status,
      200,
      "Exact retry is idempotent",
    );
    assert.equal(
      (await respond(buyer, { ...counter, note: "Changed after saving" }))
        .status,
      409,
    );
    assert.equal((await respond(buyer, { agree: true })).status, 409);
    const owner = await history();
    assert.deepEqual(
      owner.remaining,
      [2],
      "Counter does not authorize a sale or consume quantity",
    );
    assert.equal(
      owner.offers.find((o) => o.id === buyer).response.note,
      counter.note,
    );
    const receipts = await sql.query(
      "SELECT * FROM consignment_emails WHERE offer_id=$1 AND kind='response'",
      [buyer],
    );
    assert.equal(receipts.length, 1);
    assert.deepEqual(receipts[0].payload.to, ["seller@example.com"]);
    assert.deepEqual(receipts[0].payload.bcc, ["owner@example.com"]);
    assert.ok(receipts[0].payload.text.includes("$120.00"));
    const revised = await publish("sale", {
      ...sale,
      lines: [{ ...sale.lines[0], salePrice: "120", marketplaceFees: "18" }],
    });
    const own = (await sql.query(CUSTOMER_REQUEST_SQL, ["test_seller", id]))[0];
    assert.ok(
      own.consignment_approvals.some(
        (o) => o.id === buyer && o.response.action === "counter",
      ),
      "Customer retains earlier response",
    );
    assert.equal(
      (await sql.query(CUSTOMER_REQUEST_SQL, ["other_seller", id])).length,
      0,
    );
    await sql.query(
      "UPDATE consignment_emails SET status='sent' WHERE kind IN ('response','acceptance') AND offer_id<>$1",
      [buyer],
    );
    const pending = await sql.query(PENDING_CONSIGNMENT_EMAILS_SQL, []);
    assert.ok(
      pending.some((e) => e.id === receipts[0].id),
      "Confirmation remains retryable after revision",
    );
    const oldNotifications = await sql.query(
      "SELECT id FROM consignment_emails WHERE kind='offer' AND offer_id=$1",
      [buyer],
    );
    assert.ok(
      !pending.some((e) => e.id === oldNotifications[0].id),
      "Countered offer notification cannot be retried",
    );
    assert.equal((await respond(revised, { agree: true })).status, 200);
    assert.deepEqual((await history()).remaining, [1]);
    const declined = await publish("sale", sale);
    assert.equal(
      (
        await respond(declined, {
          action: "decline",
          note: "Please wait for a better offer.",
        })
      ).status,
      200,
    );
    assert.deepEqual((await history()).remaining, [1]);
    const closed = await publish("sale", sale);
    await sql.query("UPDATE submissions SET status='Closed' WHERE id=$1", [id]);
    assert.equal((await respond(closed, counter)).status, 409);
    for (const status of [
      "Counter received",
      "Seller declined",
      "Changes requested",
    ])
      assert.equal(canSetConsignmentStatus(status, "Reviewing"), false);
  } finally {
    await db.close();
    if (previous === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previous;
  }
});
