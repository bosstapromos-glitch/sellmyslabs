import test from "node:test";
import assert from "node:assert/strict";
import {
  directoryDay,
  loadShowDirectory,
  normalizeShowFeed,
  selectShows,
  showDirectoryUrl,
  validShowDate,
} from "../lib/card-shows.js";

const row = (id, date, extra = {}) => ({
  id,
  date,
  title: "Boise Card Show",
  state: "Idaho",
  stateCode: "ID",
  country: "United States",
  countryCode: "US",
  city: "Boise",
  ...extra,
});
test("public feed projection rejects malformed dates and unsafe URLs, strips private fields and deduplicates", () => {
  const { shows, importedOn } = normalizeShowFeed({
    fetchedAt: "2026-11-26T12:00:00Z",
    shows: [
      row("a", "2026-11-27", {
        contact: "private@example.com",
        notes: "private note",
        url: "javascript:alert(1)",
        website: "https://organizer.example/show",
      }),
      row("a", "2026-11-27"),
      row("bad", "2026-02-30"),
      null,
    ],
  });
  assert.equal(shows.length, 1);
  assert.equal(importedOn, "2026-11-26");
  assert.equal(shows[0].url, "");
  assert.equal(shows[0].website, "https://organizer.example/show");
  assert.ok(!("contact" in shows[0]));
  assert.ok(!("notes" in shows[0]));
  assert.equal(validShowDate("2026-02-30"), false);
});
test("upcoming includes today; archive is separate and latest first, with shared search and region filters", () => {
  const { shows } = normalizeShowFeed({
    shows: [
      row("today", "2026-11-26"),
      row("future", "2026-12-01"),
      row("past", "2026-10-28"),
      row("old", "2026-10-01"),
      row("canada", "2026-12-02", {
        title: "Montréal Card Expo",
        country: "Canada",
        countryCode: "CA",
        state: "Quebec",
        stateCode: "QC",
      }),
    ],
  });
  assert.deepEqual(
    selectShows(shows, {}, "2026-11-26").shows.map((s) => s.id),
    ["today", "future", "canada"],
  );
  assert.deepEqual(
    selectShows(shows, { when: "past" }, "2026-11-26").shows.map((s) => s.id),
    ["past", "old"],
  );
  assert.equal(
    selectShows(shows, { q: "montreal expo", region: "CA:QC" }, "2026-11-26")
      .total,
    1,
  );
  assert.equal(
    selectShows(shows, { q: "montreal", region: "US:ID" }, "2026-11-26").total,
    0,
  );
  assert.equal(selectShows(shows, { q: ["Boise"] }, "2026-11-26").q, "");
});
test("pagination is bounded and links preserve filters without embedding unsafe query text", () => {
  const { shows } = normalizeShowFeed({
    shows: Array.from({ length: 55 }, (_, i) => row(String(i), "2026-12-01")),
  });
  const result = selectShows(
    shows,
    { page: "99999999999999999999999" },
    "2026-11-26",
  );
  assert.equal(result.page, 3);
  assert.equal(result.shows.length, 7);
  assert.equal(selectShows(shows, { page: "-8" }, "2026-11-26").page, 1);
  const url = showDirectoryUrl({
    q: "Boise & cards",
    region: "US:ID",
    when: "past",
    page: 2,
  });
  assert.equal(
    new URL(url, "https://www.sellmyslabs.net").searchParams.get("q"),
    "Boise & cards",
  );
  assert.ok(url.includes("when=past"));
  assert.ok(url.includes("page=2"));
});
test("feed outages and malformed payloads have an explicit recoverable state, distinct from empty data", async () => {
  assert.equal(
    (
      await loadShowDirectory(async () => {
        throw Error("offline");
      })
    ).unavailable,
    true,
  );
  assert.equal(
    (await loadShowDirectory(async () => ({ ok: false }))).unavailable,
    true,
  );
  assert.equal(
    (
      await loadShowDirectory(async () => ({
        ok: true,
        json: async () => ({ error: "failed" }),
      }))
    ).unavailable,
    true,
  );
  const empty = await loadShowDirectory(async () => ({
    ok: true,
    json: async () => ({ shows: [] }),
  }));
  assert.equal(empty.unavailable, false);
  assert.deepEqual(empty.shows, []);
});
test("directory day uses the shop timezone around midnight UTC", () => {
  assert.equal(directoryDay(new Date("2026-11-27T01:00:00Z")), "2026-11-26");
});
