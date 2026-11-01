import test from "node:test";
import assert from "node:assert/strict";
import { importCards } from "../lib/import-cards";
import { emptyCard, emptyDraft, restoreDraft } from "../lib/draft";
import { stepErrors } from "../lib/sell-validation";
import { cardSchema, submissionSchema } from "../lib/validation";

const slab = {
  ...emptyCard(),
  itemType: "Graded card",
  name: "Charizard ex",
  category: "Pokémon",
  grader: "TAG",
  grade: "9",
};
const draft = {
  ...emptyDraft(),
  id: "5affbb6e-d6f6-4bcc-8946-31df2ab5d059",
  name: "Test Seller",
  email: "test@example.com",
  cards: [slab],
  consent: true,
};

test("new items require deliberate type, category and grader choices; restored choices remain intact", () => {
  const blank = emptyCard();
  assert.equal(blank.itemType, "");
  assert.equal(blank.category, "");
  assert.equal(blank.grader, "");
  assert.equal(blank.quantity, 1);
  assert.equal(cardSchema.safeParse(blank).success, false);
  assert.ok(stepErrors(emptyDraft(), 0, 0)["item-0-itemType"]);
  assert.ok(stepErrors(emptyDraft(), 0, 0).photos);
  const restored = restoreDraft(JSON.stringify(draft), () => "unused");
  assert.deepEqual(restored.cards, draft.cards);
  assert.equal(restored.consent, false);
  const partial = restoreDraft(
    JSON.stringify({ cards: [blank] }),
    () => draft.id,
  );
  assert.equal(partial.cards[0].itemType, "");
  assert.equal(partial.cards[0].category, "");
});

test("each step reports actionable errors and allows genuinely optional fields to stay empty", () => {
  assert.deepEqual(stepErrors(draft, 1, 0), {});
  assert.deepEqual(stepErrors(draft, 1, 1), {});
  assert.deepEqual(stepErrors(draft, 1, 2), {});
  assert.ok(stepErrors(draft, 0, 0).photos);
  assert.ok(stepErrors(draft, 9, 0).photos);
  const contact = stepErrors(
    { ...draft, name: "  ", email: "not-an-email" },
    1,
    1,
  );
  assert.match(contact.name, /name/);
  assert.match(contact.email, /email/);
  assert.ok(stepErrors({ ...draft, consent: false }, 1, 2).consent);
  assert.equal(submissionSchema.safeParse(draft).success, true);
  assert.equal(
    submissionSchema.safeParse({ ...draft, consent: false }).success,
    false,
  );
});

test("all supported item types retain required identity and quantity; only slabs require grading", () => {
  for (const itemType of ["Raw card", "Sealed product"]) {
    const item = { ...slab, itemType, grader: "", grade: "", cert: "" };
    assert.deepEqual(stepErrors({ ...draft, cards: [item] }, 1, 0), {});
    for (const patch of [
      { name: " " },
      { category: "" },
      { quantity: "" },
      { quantity: 0 },
      { quantity: 1.5 },
    ]) {
      const changed = { ...item, ...patch };
      assert.equal(cardSchema.safeParse(changed).success, false);
      assert.ok(
        Object.keys(stepErrors({ ...draft, cards: [changed] }, 1, 0)).length,
      );
    }
  }
  for (const patch of [{ grader: "" }, { grade: " " }])
    assert.equal(cardSchema.safeParse({ ...slab, ...patch }).success, false);
  const legacy = { ...slab };
  delete legacy.itemType;
  assert.equal(cardSchema.parse(legacy).itemType, "Graded card");
});

test("optional prices are positive bounded currency; invalid hidden item prices are routed to their field", () => {
  for (const asking of [
    "0",
    "-5",
    "12.345",
    "1e3",
    "1000000000000",
    "not a price",
  ]) {
    const changed = { ...draft, cards: [{ ...slab, asking }] };
    assert.ok(stepErrors(changed, 1, 0)["item-0-asking"]);
    assert.equal(submissionSchema.safeParse(changed).success, false);
  }
  assert.ok(stepErrors({ ...draft, askingTotal: "0" }, 1, 0).askingTotal);
  assert.deepEqual(
    stepErrors(
      {
        ...draft,
        askingTotal: "250.50",
        cards: [{ ...slab, asking: "125.25" }],
      },
      1,
      0,
    ),
    {},
  );
});

test("CSV imports cannot silently assign a missing category", () => {
  assert.throws(
    () => importCards("name,grader,grade\nCharizard,TAG,9\n"),
    /Row 2: Choose a category/,
  );
});
