import test from "node:test";
import assert from "node:assert/strict";
import { altResearchUrl, isGradedSlab } from "../lib/alt-research";

const slab = { itemType: "Graded card", name: "Mega Charizard X ex #023", grader: "CGC", grade: "8.5" };

test("Alt research excludes raw and sealed items even with leftover grading details", () => {
  for (const itemType of ["Raw card", "Sealed product", "Unknown"]) {
    assert.equal(isGradedSlab({ ...slab, itemType }), false);
    assert.equal(altResearchUrl({ ...slab, itemType }), null);
  }
  assert.equal(isGradedSlab({ name: "Raw Charizard" }), false);
});

test("supported slabs and older graded submissions get safely encoded research links", () => {
  const url = new URL(altResearchUrl(slab));
  assert.equal(url.origin, "https://alt.xyz");
  assert.equal(url.searchParams.get("query"), slab.name);
  assert.ok(altResearchUrl({ ...slab, itemType: undefined }));
  assert.equal(altResearchUrl({ ...slab, name: "" }), null);
  assert.equal(altResearchUrl({ ...slab, grade: "" }), null);
});

test("TAG remains a slab but never gets an unsupported Alt lookup", () => {
  const tag = { ...slab, grader: "TAG" };
  assert.equal(isGradedSlab(tag), true);
  assert.equal(altResearchUrl(tag), null);
});
