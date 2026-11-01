import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { verifiedIdentity } from "../lib/account-identity.js";
import {
  CLAIM_CUSTOMER_REQUESTS_SQL,
  CUSTOMER_REQUESTS_SQL,
  CUSTOMER_REQUEST_SQL,
  CUSTOMER_PHOTOS_SQL,
  customerRequest,
  customerStage,
  validRequestId,
} from "../lib/customer-records.js";

test("account identity requires verified emails and ignores client-editable owner claims", () => {
  const base = {
    id: "user_a",
    publicMetadata: { role: "owner" },
    unsafeMetadata: { isOwner: true },
    emailAddresses: [
      {
        emailAddress: "owner@example.com",
        verification: { status: "unverified" },
      },
      {
        emailAddress: " CUSTOMER@Example.com ",
        verification: { status: "verified" },
      },
    ],
  };
  const identity = verifiedIdentity(base, "owner@example.com");
  assert.deepEqual(identity.emails, ["customer@example.com"]);
  assert.equal(identity.isOwner, false);
  assert.equal(
    verifiedIdentity(
      {
        ...base,
        emailAddresses: [
          {
            emailAddress: " OWNER@EXAMPLE.COM ",
            verification: { status: "verified" },
          },
        ],
      },
      "owner@example.com",
    ).isOwner,
    true,
  );
  assert.equal(
    verifiedIdentity({ ...base, emailAddresses: [] }, "owner@example.com")
      .isOwner,
    false,
  );
  assert.equal(verifiedIdentity(null, "owner@example.com"), null);
});

test("customer output excludes private notes, draft prices, valuation data and blob paths", () => {
  const row = {
    id: randomUUID(),
    created_at: "2026-11-01",
    cards: [
      { name: "Card", quantity: 2, altValue: 999, privateNote: "SECRET" },
    ],
    photos: [{ pathname: "PRIVATE PATH", url: "PRIVATE URL" }],
    internal_notes: "SECRET",
    offer: 9999,
    offer_message: "UNSENT",
    status: "New",
    email: "customer@example.com",
  };
  const output = customerRequest(row),
    json = JSON.stringify(output);
  for (const text of ["SECRET", "PRIVATE", "UNSENT", "9999", "altValue"])
    assert.ok(!json.includes(text));
  assert.equal(output.offer, null);
  assert.equal(output.itemCount, 2);
  assert.equal(output.photoCount, 1);
  assert.equal(output.stage, "Submitted");
  assert.equal(customerStage({ ...row, status: "Closed" }), "Closed");
  assert.equal(customerStage({ ...row, status: "Paid" }), "Paid");
  assert.equal(
    customerStage({
      ...row,
      offer_id: "new",
      accepted_at: "2026-11-01",
      inspected_at: "2026-10-31",
      inspected_offer_id: "old",
      received_at: "2026-10-31",
    }),
    "In inspection",
  );
  assert.equal(validRequestId("not-an-id"), false);
  assert.equal(validRequestId(randomUUID()), true);
});

test("verified email claim is exact, permanent to a user ID, and every request/photo read enforces ownership", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(new URL("../scripts/schema.sql", import.meta.url), "utf8"),
    );
    const a = randomUUID(),
      b = randomUUID(),
      c = randomUUID(),
      offer = randomUUID();
    for (const [id, email] of [
      [a, " Customer@Example.com "],
      [b, "other@example.com"],
      [c, "customer+other@example.com"],
    ])
      await db.query(
        'INSERT INTO submissions(id,seller_name,email,cards,photos,internal_notes,offer,offer_version) VALUES($1,\'QA\',$2,\'[{"name":"TEST CARD","quantity":1}]\',\'[{"pathname":"private"}]\',\'SECRET\',100,1)',
        [id, email],
      );
    await db.query(CLAIM_CUSTOMER_REQUESTS_SQL, ["user_empty", []]);
    assert.equal(
      (await db.query(CUSTOMER_REQUESTS_SQL, ["user_empty", 0])).rows.length,
      0,
    );
    await db.query(CLAIM_CUSTOMER_REQUESTS_SQL, [
      "user_a",
      ["customer@example.com"],
    ]);
    await db.query(CLAIM_CUSTOMER_REQUESTS_SQL, [
      "user_b",
      ["other@example.com"],
    ]);
    assert.equal(
      (await db.query(CUSTOMER_REQUESTS_SQL, ["user_a", 0])).rows.length,
      1,
    );
    assert.equal(
      (await db.query(CUSTOMER_REQUEST_SQL, ["user_a", b])).rows.length,
      0,
    );
    assert.equal(
      (await db.query(CUSTOMER_PHOTOS_SQL, ["user_a", b])).rows.length,
      0,
    );
    assert.equal(
      (await db.query(CUSTOMER_PHOTOS_SQL, ["user_a", a])).rows.length,
      1,
    );
    await db.query(CLAIM_CUSTOMER_REQUESTS_SQL, [
      "replacement_user",
      ["customer@example.com"],
    ]);
    assert.equal(
      (await db.query(CUSTOMER_REQUESTS_SQL, ["replacement_user", 0])).rows
        .length,
      0,
    );
    await db.query(
      "INSERT INTO offer_emails(id,submission_id,version,amount,payload,purchase_snapshot) VALUES($1,$2,1,100,'{\"private\":true}','{}')",
      [offer, a],
    );
    let row = (await db.query(CUSTOMER_REQUEST_SQL, ["user_a", a])).rows[0];
    assert.equal(
      row.offer_id,
      null,
      "A pending email must not expose a draft offer",
    );
    await db.query(
      "UPDATE offer_emails SET status='sent',sent_at=now() WHERE id=$1",
      [offer],
    );
    row = (await db.query(CUSTOMER_REQUEST_SQL, ["user_a", a])).rows[0];
    assert.equal(customerRequest(row).offer.amount, 100);
    await db.query(
      "UPDATE submissions SET offer_version=2,offer=110 WHERE id=$1",
      [a],
    );
    row = (await db.query(CUSTOMER_REQUEST_SQL, ["user_a", a])).rows[0];
    assert.equal(
      row.offer_id,
      null,
      "A superseded offer is not the current offer",
    );
  } finally {
    await db.close();
  }
});
