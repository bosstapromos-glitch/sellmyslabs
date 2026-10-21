import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { submissionSchema, updateSchema } from "../lib/validation";
import { importCards } from "../lib/import-cards";
const card = {
  name: "Charizard ex",
  category: "Pokémon",
  grader: "TAG",
  grade: "9",
  quantity: 1,
  asking: "",
  cert: "",
};
const request = {
  id: "5affbb6e-d6f6-4bcc-8946-31df2ab5d059",
  name: "Test Seller",
  email: "test@example.com",
  phone: "",
  notes: "",
  cards: [card],
  consent: true,
  website: "",
};
test("TAG submissions are accepted; malformed contact, consent, quantities and prices are rejected", () => {
  assert.equal(submissionSchema.safeParse(request).success, true);
  for (const patch of [
    { email: "not-email" },
    { consent: false },
    { website: "spam" },
    { cards: [{ ...card, grader: "Unknown" }] },
    { cards: [{ ...card, quantity: -1 }] },
    { cards: [{ ...card, asking: "1e8" }] },
  ])
    assert.equal(
      submissionSchema.safeParse({ ...request, ...patch }).success,
      false,
    );
  assert.equal(
    updateSchema.safeParse({
      id: request.id,
      status: "Paid",
      notes: "Checked",
      offer: "125.50",
    }).success,
    true,
  );
  assert.equal(
    updateSchema.safeParse({
      id: request.id,
      status: "Invalid",
      notes: "",
      offer: "",
    }).success,
    false,
  );
});
test("bulk import supports TAG, quoted commas and rejects unsupported graders without partial imports", () => {
  const cards = importCards(
    'name,category,grader,grade,quantity\n"Charizard, ex",Pokémon,TAG,9,2\n',
  );
  assert.equal(cards[0].grader, "TAG");
  assert.equal(cards[0].quantity, 2);
  assert.equal(cards[0].name, "Charizard, ex");
  assert.throws(() => importCards("name,grader,grade\nCard,Fake,9\n"));
  assert.throws(() => importCards("name,grader,grade\n"));
});
test("Postgres schema persists requests, prevents duplicate IDs, saves offers and consumes login tokens once", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(new URL("../scripts/schema.sql", import.meta.url), "utf8"),
    );
    await db.query(
      "INSERT INTO submissions(id,seller_name,email,cards) VALUES($1,$2,$3,$4)",
      [request.id, request.name, request.email, JSON.stringify(request.cards)],
    );
    const first = await db.query("SELECT * FROM submissions WHERE id=$1", [
      request.id,
    ]);
    assert.equal(first.rows[0].cards[0].grader, "TAG");
    assert.equal(first.rows[0].status, "New");
    assert.equal(first.rows[0].notified_at, null);
    await assert.rejects(
      db.query(
        "INSERT INTO submissions(id,seller_name,email,cards) VALUES($1,$2,$3,$4)",
        [request.id, "Duplicate", request.email, "[]"],
      ),
    );
    await db.query(
      "UPDATE submissions SET status=$1,offer=$2,internal_notes=$3 WHERE id=$4",
      ["Offer ready", "125.50", "Private", request.id],
    );
    const saved = await db.query(
      "SELECT status,offer,internal_notes FROM submissions WHERE id=$1",
      [request.id],
    );
    assert.equal(saved.rows[0].status, "Offer ready");
    assert.equal(Number(saved.rows[0].offer), 125.5);
    await db.exec(
      "INSERT INTO login_tokens VALUES ('hash',now()+interval '15 minutes')",
    );
    const consume = () =>
      db.query(
        "DELETE FROM login_tokens WHERE hash=$1 AND expires_at>now() RETURNING hash",
        ["hash"],
      );
    assert.equal((await consume()).rows.length, 1);
    assert.equal((await consume()).rows.length, 0);
    await db.exec(
      "INSERT INTO login_tokens VALUES ('old',now()-interval '1 minute')",
    );
    assert.equal(
      (
        await db.query(
          "DELETE FROM login_tokens WHERE hash=$1 AND expires_at>now() RETURNING hash",
          ["old"],
        )
      ).rows.length,
      0,
    );
    for (let i = 1; i <= 6; i++) {
      const result = await db.query(
        "INSERT INTO rate_limits(key,bucket) VALUES($1,$2) ON CONFLICT(key,bucket) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits",
        ["iphash", 1],
      );
      assert.equal(result.rows[0].hits, i);
    }
  } finally {
    await db.close();
  }
});
