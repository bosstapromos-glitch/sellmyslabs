import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPurchaseOfferHandler } from "../lib/purchase-handler";
import { purchaseSnapshot, PURCHASE_TERMS } from "../lib/purchase-terms";
import { purchaseToken } from "../lib/purchase-token";
import {
  SAVE_OFFER_SQL,
  CLAIM_OFFER_SQL,
  OFFER_SUMMARY_SQL,
} from "../lib/offer-records";
import {
  PURCHASE_HISTORY_SQL,
  PURCHASE_OFFER_SQL,
} from "../lib/purchase-records";
import { deliverPurchaseReceipt } from "../lib/purchase-receipts";
import { CUSTOMER_REQUEST_SQL, customerRequest } from "../lib/customer-records";
import { canSetPurchaseResponseStatus } from "../lib/purchase-response";

test("direct offer handlers persist counters and declines, protect decisions, keep history and send durable copies", async () => {
  const db = new PGlite(),
    oldKey = process.env.SESSION_SECRET,
    oldMail = process.env.RESEND_API_KEY;
  process.env.SESSION_SECRET =
    "direct-response-qa-only-secret-at-least-32-characters";
  process.env.RESEND_API_KEY = "qa-only";
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
      "INSERT INTO submissions(id,seller_name,email,cards,customer_user_id) VALUES($1,$2,$3,$4,$5)",
      [
        id,
        "QA Seller",
        "seller@example.com",
        JSON.stringify([
          { name: "QA slab", grader: "TAG", grade: "9", quantity: 2 },
        ]),
        "qa_seller",
      ],
    );
    const current = async () =>
      (await sql.query("SELECT * FROM submissions WHERE id=$1", [id]))[0];
    const save = async (price, options = {}) => {
      const s = await current();
      return (
        await sql.query(SAVE_OFFER_SQL, [
          id,
          options.status || s.status,
          "Private",
          price,
          s.offer_version,
          randomUUID(),
          JSON.stringify({ to: ["seller@example.com"] }),
          options.message || "",
          "[]",
          JSON.stringify(purchaseSnapshot(s, price)),
          options.force || false,
          options.version ?? s.edit_version,
        ])
      )[0];
    };
    const publish = async (price, options = {}) => {
      const s = await save(price, options);
      assert.ok(s?.queued_email);
      await sql.query("UPDATE offer_emails SET status='sent' WHERE id=$1", [
        s.queued_email,
      ]);
      return s.queued_email;
    };
    let failMail = true;
    const calls = [];
    const deps = {
      sql,
      sameOrigin: (r) => r.headers.get("origin") === "https://example.com",
      limited: async () => false,
      mailConfig: () => ({
        from: "shop@example.com",
        replyTo: "owner@example.com",
        site: "https://example.com",
        enabled: true,
      }),
      deliver: (id) =>
        deliverPurchaseReceipt(id, {
          sql,
          fetchEmail: async (url, opts) => {
            calls.push(opts);
            if (failMail) throw Error("Offline");
            return Response.json({ id: "qa-delivery" });
          },
        }),
    };
    const handlers = createPurchaseOfferHandler(deps);
    const post = (
      offer,
      body = {},
      origin = "https://example.com",
      token = purchaseToken(offer),
    ) =>
      handlers.POST(
        new Request("https://example.com/api/offers/" + token, {
          method: "POST",
          headers: { origin },
          body: JSON.stringify({
            name: "QA Seller",
            termsVersion: PURCHASE_TERMS.version,
            ...body,
          }),
        }),
        { params: Promise.resolve({ token }) },
      );
    const counter = {
      action: "counter",
      amount: "$120.00",
      note: "Recent sales support this total.",
    };
    const first = await publish("100");
    assert.equal(
      (await post(first, counter, "https://evil.example")).status,
      403,
    );
    assert.equal(
      (await post(first, counter, "https://example.com", "invalid")).status,
      404,
    );
    for (const body of [
      { ...counter, amount: "" },
      { ...counter, amount: "100" },
      { ...counter, amount: "-1" },
      { ...counter, amount: "1.001" },
      { ...counter, amount: "1e6" },
      { ...counter, note: "x".repeat(2001) },
      { ...counter, name: "X" },
      { action: "changes" },
    ])
      assert.equal((await post(first, body)).status, 400);
    assert.equal(
      (await post(first, { ...counter, termsVersion: "old" })).status,
      409,
    );
    assert.equal((await post(first, { agree: false })).status, 400);
    const version = (await current()).edit_version;
    const result = await post(first, counter);
    assert.equal(
      result.status,
      200,
      JSON.stringify(await result.clone().json()),
    );
    const offered = (await result.json()).offer;
    assert.equal(offered.response.amount, "120.00");
    assert.equal(offered.snapshot.amount, "100.00");
    assert.equal(offered.acceptedAt, null);
    assert.equal(offered.canAccept, false);
    assert.equal(offered.receiptSent, false);
    assert.equal(offered.recipients, undefined);
    assert.equal((await current()).status, "Counter received");
    assert.equal(
      await save("125", { version }),
      undefined,
      "Stale owner edit cannot overwrite counter",
    );
    assert.equal(
      (await post(first, { ...counter, amount: "120" })).status,
      200,
      "Equivalent duplicate retry",
    );
    assert.equal(calls.length, 1, "Duplicate response does not resend");
    assert.equal(
      (await post(first, { ...counter, note: "Changed" })).status,
      409,
    );
    assert.equal((await post(first, { action: "decline" })).status, 409);
    assert.equal((await post(first, { agree: true })).status, 409);
    const summary = (await sql.query(OFFER_SUMMARY_SQL, [id]))[0];
    assert.equal(summary.response.amount, "120.00");
    assert.equal(summary.can_retry, false);
    const own = customerRequest(
      (await sql.query(CUSTOMER_REQUEST_SQL, ["qa_seller", id]))[0],
    );
    assert.equal(own.stage, "Counteroffer sent");
    assert.equal(own.offer.response.amount, "120.00");
    assert.equal(own.purchaseRecords[0].id, first);
    assert.equal(
      (await sql.query(CUSTOMER_REQUEST_SQL, ["other", id])).length,
      0,
    );
    assert.equal(
      (await save("100")).queued_email,
      null,
      "Private save does not issue a new offer",
    );
    const second = await publish("120");
    assert.equal((await current()).status, "Offer ready");
    const history = await sql.query(PURCHASE_HISTORY_SQL, [id]);
    assert.equal(history[0].response.note, counter.note);
    const ownNew = customerRequest(
      (await sql.query(CUSTOMER_REQUEST_SQL, ["qa_seller", id]))[0],
    );
    assert.equal(ownNew.offer.id, second);
    assert.equal(ownNew.purchaseRecords[0].id, first);
    failMail = false;
    await deps.deliver(first);
    assert.equal(calls[0].body, calls[1].body);
    assert.equal(
      calls[0].headers["Idempotency-Key"],
      calls[1].headers["Idempotency-Key"],
    );
    const payload = JSON.parse(calls[1].body);
    assert.deepEqual(payload.to, ["seller@example.com"]);
    assert.deepEqual(payload.bcc, ["owner@example.com"]);
    assert.ok(payload.text.includes("$120.00"));
    assert.ok(!payload.text.includes("Private"));
    const count = calls.length;
    await deps.deliver(first);
    assert.equal(calls.length, count);
    assert.equal((await post(second, { agree: true })).status, 200);
    assert.equal(
      (await post(second, { action: "decline" })).status,
      409,
      "Cannot decline accepted agreement",
    );
    const third = await publish("130");
    assert.equal(
      (
        await post(third, {
          action: "decline",
          note: "Too low for the collection.",
        })
      ).status,
      200,
    );
    assert.equal((await current()).status, "Seller declined");
    assert.equal((await post(third, { agree: true })).status, 409);
    const fourth = await publish("130", { force: true });
    assert.equal((await current()).status, "Offer ready");
    const fifth = await publish("140");
    assert.equal(
      (await post(fourth, { action: "decline" })).status,
      409,
      "Superseded offer cannot get a response",
    );
    await sql.query("UPDATE submissions SET status='Closed' WHERE id=$1", [id]);
    assert.equal((await post(fifth, counter)).status, 409);
    await sql.query("UPDATE submissions SET status='Paid' WHERE id=$1", [id]);
    assert.equal((await post(fifth, counter)).status, 409);
    await sql.query("UPDATE offer_emails SET status='failed' WHERE id=$1", [
      third,
    ]);
    assert.equal(
      (await sql.query(CLAIM_OFFER_SQL, [third, randomUUID()])).length,
      0,
    );
    assert.equal(
      canSetPurchaseResponseStatus("Counter received", "Reviewing"),
      false,
    );
    assert.equal(
      canSetPurchaseResponseStatus("Seller declined", "Seller declined"),
      true,
    );
    const receipts = await sql.query("SELECT * FROM purchase_receipts", []);
    assert.equal(receipts.length, 3);
    assert.equal(new Set(receipts.map((r) => r.offer_id)).size, 3);
  } finally {
    await db.close();
    if (oldKey === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = oldKey;
    if (oldMail === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = oldMail;
  }
});
