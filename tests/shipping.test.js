import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  trackingSchema,
  trackingUrl,
  publicShipment,
  SHIPMENT_SQL,
  SAVE_TRACKING_SQL,
  SAVE_PROGRESS_SQL,
} from "../lib/shipping.js";

test("tracking input produces only allowlisted carrier URLs and accepts printed spacing", () => {
  const input = trackingSchema.parse({
    carrier: "UPS",
    tracking: "1z 999 aa1 01 2345 6784",
    version: 0,
  });
  assert.equal(input.tracking, "1Z999AA10123456784");
  for (const carrier of ["USPS", "UPS", "FedEx"]) {
    const url = new URL(trackingUrl(carrier, "9400111899560000000000"));
    assert.equal(url.protocol, "https:");
    assert.ok(
      ["tools.usps.com", "www.ups.com", "www.fedex.com"].includes(url.hostname),
    );
  }
  for (const tracking of [
    "",
    "abc",
    "https://evil.example/track",
    "abc<script>12345",
    "x".repeat(81),
  ])
    assert.equal(
      trackingSchema.safeParse({ carrier: "UPS", tracking, version: 0 })
        .success,
      false,
    );
  assert.equal(trackingUrl("Other", "9400111899560000000000"), null);
  assert.equal(
    trackingSchema.safeParse({ ...input, version: -1 }).success,
    false,
  );
});

test("shipping reads expose only customer-safe fields and do not carry inspection into a revised offer", () => {
  const row = {
    offer_id: "current",
    inspected_offer_id: "old",
    paid_offer_id: "old",
    inspected_at: "2026-01-03",
    paid_at: "2026-01-03",
    received_at: "2026-01-02",
    accepted_at: "2026-01-01",
    is_current: true,
    request_status: "Agreed",
    carrier: "UPS",
    tracking: "1Z999AA10123456784",
    internal_notes: "PRIVATE",
    email: "private@example.com",
    payload: { secret: "never" },
  };
  const value = publicShipment(row);
  assert.equal(value.inspectedAt, null);
  assert.equal(value.paidAt, null);
  assert.equal(value.receivedAt, new Date(row.received_at).toISOString());
  assert.equal(value.canEdit, false);
  assert.equal(value.canProgress, true);
  assert.ok(!JSON.stringify(value).includes("PRIVATE"));
  assert.equal(value.payload, undefined);
  assert.equal(value.email, undefined);
  assert.equal(
    publicShipment({ ...row, request_status: "Closed" }).canProgress,
    false,
  );
});

test("shipment and shop milestones require accepted current offers, reject stale writes and preserve order", async () => {
  const db = new PGlite();
  try {
    const schema = await readFile(
      new URL("../scripts/schema.sql", import.meta.url),
      "utf8",
    );
    await db.exec(schema);
    await db.exec(schema);
    const id = randomUUID(),
      offer = randomUUID(),
      other = randomUUID();
    await db.query(
      "INSERT INTO submissions(id,seller_name,email,cards,offer,offer_version,status) VALUES($1,'Shipping QA','qa@example.com','[]',100,1,'Offer ready')",
      [id],
    );
    await db.query(
      "INSERT INTO offer_emails(id,submission_id,version,amount,payload,purchase_snapshot) VALUES($1,$2,1,100,'{}','{}')",
      [offer, id],
    );
    const ship = async (offerId, version, tracking = "1Z999AA10123456784") =>
      (await db.query(SAVE_TRACKING_SQL, [offerId, "UPS", tracking, version]))
        .rows;
    const progress = async (
      action,
      version,
      at = "2026-01-02T12:00:00Z",
      offerId = offer,
      editVersion,
    ) => {
      const currentVersion =
        editVersion ??
        (
          await db.query("SELECT edit_version FROM submissions WHERE id=$1", [
            id,
          ])
        ).rows[0].edit_version;
      return (
        await db.query(SAVE_PROGRESS_SQL, [
          offerId,
          action,
          version,
          at,
          currentVersion,
        ])
      ).rows;
    };
    const read = async (offerId = offer) =>
      publicShipment((await db.query(SHIPMENT_SQL, [offerId])).rows[0]);
    assert.equal(
      (await ship(offer, 0)).length,
      0,
      "An unaccepted offer cannot ship",
    );
    assert.equal(
      (await ship(other, 0)).length,
      0,
      "An unknown offer cannot ship",
    );
    await db.query(
      "UPDATE offer_emails SET accepted_at='2026-01-01' WHERE id=$1",
      [offer],
    );
    assert.equal(
      (await progress("paid", 0)).length,
      0,
      "Cannot skip receipt and inspection",
    );
    assert.equal(
      (await ship(offer, 4)).length,
      0,
      "A nonzero version cannot create a missing record",
    );
    assert.equal((await ship(offer, 0)).length, 1);
    const shipped = (await read()).shippedAt;
    assert.equal(
      (await ship(offer, 0, "1Z999AA10123456785")).length,
      0,
      "Stale tracking cannot overwrite",
    );
    assert.equal((await ship(offer, 1, "1Z999AA10123456785")).length, 1);
    assert.equal(
      (await read()).shippedAt,
      shipped,
      "Editing preserves first confirmation time",
    );
    assert.equal((await progress("inspected", 2)).length, 0);
    assert.equal((await progress("received", 2)).length, 1);
    assert.equal(
      (await progress("inspected", 3, "2026-01-02T13:00:00Z", offer, 0)).length,
      0,
      "Stale owner detail cannot advance progress",
    );
    assert.equal(
      (await ship(offer, 3)).length,
      0,
      "Received packages cannot have tracking replaced",
    );
    assert.equal(
      (await progress("received", 3)).length,
      0,
      "Cannot rewrite receipt time",
    );
    assert.equal(
      (await progress("inspected", 2)).length,
      0,
      "Stale progress rejected",
    );
    assert.equal(
      (await progress("inspected", 3, "2026-01-01T12:00:00Z")).length,
      0,
      "Cannot inspect before receipt",
    );
    assert.equal(
      (await progress("inspected", 3, "2026-01-02T13:00:00Z")).length,
      1,
    );
    assert.equal(
      (await progress("paid", 4, "2026-01-02T12:00:00Z")).length,
      0,
      "Cannot pay before inspection",
    );
    assert.equal((await progress("paid", 4, "2026-01-02T14:00:00Z")).length, 1);
    assert.equal(
      (await db.query("SELECT status FROM submissions WHERE id=$1", [id]))
        .rows[0].status,
      "Paid",
    );
    assert.equal(
      (await progress("paid", 5)).length,
      0,
      "Repeated payment mark does not change timestamp",
    );
    const replacement = randomUUID();
    await db.query(
      "UPDATE submissions SET offer=110,offer_version=2,status='Agreed' WHERE id=$1",
      [id],
    );
    await db.query(
      "INSERT INTO offer_emails(id,submission_id,version,amount,payload,purchase_snapshot,accepted_at) VALUES($1,$2,2,110,'{}','{}','2026-01-02T15:00:00Z')",
      [replacement, id],
    );
    assert.equal(
      (await ship(offer, 5)).length,
      0,
      "Old accepted links cannot edit shipping",
    );
    assert.equal(
      (await progress("inspected", 5)).length,
      0,
      "Old offer cannot advance progress",
    );
    const revised = await read(replacement);
    assert.ok(revised.receivedAt);
    assert.equal(revised.inspectedAt, null);
    assert.equal(revised.paidAt, null);
    assert.equal(
      (await progress("paid", 5, "2026-01-02T16:00:00Z", replacement)).length,
      0,
      "Revised offer needs its own inspection confirmation",
    );
    assert.equal(
      (await progress("inspected", 5, "2026-01-02T16:00:00Z", replacement))
        .length,
      1,
    );
    await db.query("UPDATE submissions SET status='Closed' WHERE id=$1", [id]);
    assert.equal(
      (await progress("paid", 6, "2026-01-02T17:00:00Z", replacement)).length,
      0,
    );
    assert.equal(
      (await db.query("SELECT count(*) FROM purchase_receipts")).rows[0].count,
      0,
      "Progress never sends an offer or acceptance email",
    );
  } finally {
    await db.close();
  }
});
