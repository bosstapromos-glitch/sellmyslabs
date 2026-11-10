import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  emptyDraft,
  emptyCard,
  restoreDraft,
  hasDraftContent,
} from "../lib/draft";
import { submissionSchema } from "../lib/validation";
import { createSubmissionHandler } from "../lib/submission-handler";
import { stagePhoto } from "../lib/submission-uploads";
import { saveAccountDraft } from "../lib/account-drafts";
import { SAVE_OFFER_SQL } from "../lib/offer-records";
import { customerStage } from "../lib/customer-records";

test("sale preference survives drafts; legacy requests stay direct and unsupported values are rejected", () => {
  const legacy = {
    ...emptyDraft(),
    id: randomUUID(),
    name: "Test Seller",
    email: "test@example.com",
    consent: true,
    cards: [
      {
        ...emptyCard(),
        itemType: "Raw card",
        name: "Test card",
        category: "Pokémon",
      },
    ],
  };
  delete legacy.saleMethod;
  assert.equal(submissionSchema.parse(legacy).saleMethod, "direct");
  assert.equal(
    restoreDraft(JSON.stringify(legacy), randomUUID).saleMethod,
    "direct",
  );
  assert.equal(
    restoreDraft(
      JSON.stringify({ ...legacy, saleMethod: "consignment" }),
      randomUUID,
    ).saleMethod,
    "consignment",
  );
  assert.equal(
    hasDraftContent({ ...emptyDraft(), saleMethod: "consignment" }),
    true,
  );
  assert.equal(
    submissionSchema.safeParse({ ...legacy, saleMethod: "other" }).success,
    false,
  );
});

test("real submission handlers preserve direct and consignment choices for guest and account drafts", async () => {
  const database = new PGlite();
  try {
    await database.exec(
      await readFile(new URL("../scripts/schema.sql", import.meta.url), "utf8"),
    );
    const sql = async (parts, ...values) =>
      (
        await database.query(
          parts.reduce((s, p, i) => s + (i ? "$" + i : "") + p, ""),
          values,
        )
      ).rows;
    sql.query = async (q, p) => (await database.query(q, p)).rows;
    const identity = {
      id: "consignment_qa",
      emails: ["test@example.com"],
      email: "test@example.com",
    };
    const deps = {
      sql,
      db: () => sql,
      configured: () => true,
      sameOrigin: () => true,
      limited: async () => false,
      getIdentity: async () => identity,
      put: async (path) => ({ url: path, pathname: path }),
      del: async () => {},
      after: () => {},
      notifySubmission: async () => {
        throw Error("No real emails in this test");
      },
    };
    const submit = createSubmissionHandler(deps);
    for (const account of [false, true])
      for (const saleMethod of ["direct", "consignment"]) {
        const id = randomUUID();
        const data = {
          ...emptyDraft(),
          id,
          saleMethod,
          name: "Test Seller",
          email: "test@example.com",
          consent: true,
          cards: [
            {
              ...emptyCard(),
              itemType: "Raw card",
              name: "Test card",
              category: "Pokémon",
            },
          ],
        };
        const receipt = await stagePhoto(
          id,
          new File([new Uint8Array([255, 216, 255, 1])], "test.jpg", {
            type: "image/jpeg",
          }),
          deps,
        );
        const form = new FormData();
        form.set("data", JSON.stringify(data));
        form.set("uploads", JSON.stringify([receipt.token]));
        if (account) {
          const saved = await saveAccountDraft(
            identity,
            {
              id,
              version: 0,
              data,
              photos: [{ token: receipt.token, name: "test.jpg" }],
            },
            sql,
          );
          form.set("draftVersion", String(saved.version));
        }
        const response = await submit(
          new Request("https://example.com/api/submissions", {
            method: "POST",
            body: form,
          }),
        );
        assert.equal(
          response.status,
          201,
          JSON.stringify(await response.json()),
        );
        const [row] = await sql.query(
          "SELECT sale_method,customer_user_id FROM submissions WHERE id=$1",
          [id],
        );
        assert.equal(row.sale_method, saleMethod);
        assert.equal(row.customer_user_id, account ? identity.id : null);
        if (saleMethod === "consignment") {
          const [saved] = await sql.query(SAVE_OFFER_SQL, [
            id,
            "Listed",
            "Owner-only test note",
            null,
            0,
            randomUUID(),
            "null",
            "",
            "[]",
            null,
            false,
            0,
          ]);
          assert.equal(saved.status, "Listed");
          assert.equal(saved.queued_email, null);
          assert.equal(
            customerStage({ ...row, status: saved.status }),
            "Listed for sale",
          );
          const queued = await sql.query(
            "SELECT id FROM offer_emails WHERE submission_id=$1",
            [id],
          );
          assert.equal(
            queued.length,
            0,
            "Consignment status saves never queue a purchase offer",
          );
        }
      }
  } finally {
    await database.close();
  }
});

test("consignment payout uses the gross sale tier, deducts fees first and rounds once to cents", async () => {
  const { consignmentRate, consignmentPayout } = await import(
    "../lib/consignment"
  );
  for (const [cents, percent] of [
    [99, 80],
    [999, 80],
    [1000, 82],
    [2499, 82],
    [2500, 87],
    [49999, 87],
    [50000, 90],
    [99999, 90],
    [100000, 96],
    [499999, 96],
    [500000, 97],
  ])
    assert.equal(consignmentRate(cents), percent);
  assert.equal(consignmentRate(98), null);
  assert.equal(consignmentRate(99.5), null);
  assert.deepEqual(consignmentPayout(10000, 1500, 99), {
    percent: 87,
    netSaleCents: 8401,
    sellerPayoutCents: 7309,
    shopShareCents: 1092,
  });
  assert.equal(
    consignmentPayout(100000, 15000, 99).percent,
    96,
    "Fees do not push the sale into a lower tier",
  );
  assert.equal(
    consignmentPayout(10000, 0, 99).sellerPayoutCents,
    8614,
    "In-store sale can have zero marketplace fees",
  );
  assert.throws(() => consignmentPayout(10000, -1, 99));
  assert.throws(() => consignmentPayout(1000, 1500, 99));
});

test("consignment has its own customer stages and cannot create direct-purchase terms", async () => {
  const { customerRequest, customerStage } = await import(
    "../lib/customer-records"
  );
  const { purchaseSnapshot } = await import("../lib/purchase-terms");
  const row = {
    id: randomUUID(),
    sale_method: "consignment",
    status: "Listed",
    cards: [],
    photos: [],
  };
  assert.equal(customerRequest(row).saleMethod, "consignment");
  assert.equal(customerStage(row), "Listed for sale");
  assert.equal(
    customerStage({ ...row, status: "Sold" }),
    "Sold · awaiting payout",
  );
  assert.equal(customerStage({ ...row, status: "Paid" }), "Payment sent");
  assert.throws(() => purchaseSnapshot(row, 100), /Consignment/);
});
