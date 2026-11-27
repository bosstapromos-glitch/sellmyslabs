import test from "node:test";
import assert from "node:assert/strict";
import {
  combineShowSources,
  directShowUrl,
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
      }, null)
    ).unavailable,
    true,
  );
  assert.equal(
    (await loadShowDirectory(async () => ({ ok: false }), null)).unavailable,
    true,
  );
  assert.equal(
    (
      await loadShowDirectory(
        async () => ({
          ok: true,
          json: async () => ({ error: "failed" }),
        }),
        null,
      )
    ).unavailable,
    true,
  );
  const empty = await loadShowDirectory(
    async () => ({
      ok: true,
      json: async () => ({ shows: [] }),
    }),
    null,
  );
  assert.equal(empty.unavailable, false);
  assert.deepEqual(empty.shows, []);
});
test("directory day uses the shop timezone around midnight UTC", () => {
  assert.equal(directoryDay(new Date("2026-11-27T01:00:00Z")), "2026-11-26");
});

test("a newer TCDB import replaces its coverage range, preserves community/history, and yields to newer shared data", () => {
  const shared = {
    ...normalizeShowFeed({
      fetchedAt: "2026-10-21",
      shows: [
        row("history", "2026-10-01"),
        row("removed", "2026-11-28"),
        row("community", "2026-11-28", { source: "community" }),
        row("later", "2027-01-01"),
      ],
    }),
    unavailable: false,
  };
  const snapshot = {
    fetchedAt: "2026-11-26",
    coverageFrom: "2026-11-26",
    coverageThrough: "2026-12-10",
    shows: [row("fresh", "2026-11-28")],
  };
  const combined = combineShowSources(shared, snapshot);
  assert.deepEqual(
    combined.shows.map((s) => s.id),
    ["history", "community", "later", "fresh"],
  );
  assert.equal(combined.importedOn, "2026-11-26");
  const newer = { ...shared, importedOn: "2026-11-27", shows: [] };
  assert.equal(combineShowSources(newer, snapshot), newer);
});

test("reviewed TCDB data remains usable when the shared feed is unavailable", async () => {
  const data = await loadShowDirectory(async () => {
    throw Error("offline");
  });
  assert.equal(data.unavailable, false);
  assert.ok(data.shows.length > 0);
  assert.ok(
    data.shows.every((s) =>
      s.url.startsWith("https://www.tcdb.com/CardShows.cfm?"),
    ),
  );
});

test("show website actions use direct external sites and never TCDB fallback links", () => {
  assert.equal(
    directShowUrl("https://www.tcdb.com/CardShows.cfm?MODE=VIEW&ID=42"),
    "",
  );
  assert.equal(directShowUrl("https://TCDB.com/"), "");
  assert.equal(directShowUrl("javascript:alert(1)"), "");
  assert.equal(
    directShowUrl("https://organizer.example/event"),
    "https://organizer.example/event",
  );
  const { shows } = normalizeShowFeed({
    shows: [
      row("one", "2026-12-01", {
        url: "https://www.tcdb.com/CardShows.cfm?MODE=VIEW&ID=42",
      }),
    ],
  });
  assert.equal(shows[0].website, "");
});
