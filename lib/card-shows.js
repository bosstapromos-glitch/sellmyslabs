export const SHOW_FEED_URL = "https://lifestylecards.co/api/shows";
export const SHOW_PAGE_SIZE = 24;

const text = (value, limit = 300) =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";
const searchable = (value) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function safeShowUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}

export function validShowDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function directoryDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Boise",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// Only public event fields cross into this application; never forward the raw feed.
export function normalizeShowFeed(payload) {
  if (!payload || !Array.isArray(payload.shows))
    throw new Error("Invalid show feed");
  const seen = new Set();
  const shows = [];
  for (const row of payload.shows) {
    if (!row || !validShowDate(row.date)) continue;
    const id = text(row.id, 150),
      title = text(row.title);
    if (!id || !title || seen.has(id)) continue;
    seen.add(id);
    const country = text(row.country, 80),
      state = text(row.state, 80);
    const countryCode = text(row.countryCode, 8),
      stateCode = text(row.stateCode, 20);
    shows.push({
      id,
      title,
      date: row.date,
      time: text(row.time, 120),
      venue: text(row.venue),
      city: text(row.city, 120),
      country,
      state,
      location: text(row.location),
      address: text(row.address, 500),
      region: `${countryCode || country}:${stateCode || state}`,
      regionLabel: state ? `${state}, ${countryCode || country}` : country,
      url: safeShowUrl(row.url),
      website: safeShowUrl(row.website),
    });
  }
  if (payload.shows.length && !shows.length)
    throw new Error("No valid events in feed");
  const importedOn = text(payload.fetchedAt).slice(0, 10);
  return { shows, importedOn: validShowDate(importedOn) ? importedOn : null };
}

export async function loadShowDirectory(fetcher = fetch) {
  try {
    const response = await fetcher(SHOW_FEED_URL, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Show feed unavailable");
    return { ...normalizeShowFeed(await response.json()), unavailable: false };
  } catch {
    return { shows: [], importedOn: null, unavailable: true };
  }
}

export function selectShows(shows, params = {}, today = directoryDay()) {
  const q = text(params.q, 100),
    region = text(params.region, 100);
  const when = params.when === "past" ? "past" : "upcoming";
  const terms = searchable(q).split(/\s+/).filter(Boolean);
  const filtered = shows
    .filter((show) => {
      if ((when === "past") !== show.date < today) return false;
      if (region && show.region !== region) return false;
      const haystack = searchable(
        [
          show.title,
          show.city,
          show.venue,
          show.location,
          show.address,
          show.regionLabel,
        ].join(" "),
      );
      return terms.every((term) => haystack.includes(term));
    })
    .sort(
      (a, b) =>
        (when === "past"
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date)) ||
        a.title.localeCompare(b.title) ||
        a.id.localeCompare(b.id),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / SHOW_PAGE_SIZE));
  const requested = /^\d+$/.test(String(params.page)) ? Number(params.page) : 1;
  const page = Math.min(pages, Math.max(1, requested || 1));
  return {
    q,
    region,
    when,
    total: filtered.length,
    page,
    pages,
    shows: filtered.slice((page - 1) * SHOW_PAGE_SIZE, page * SHOW_PAGE_SIZE),
  };
}

export function showDirectoryUrl({
  q = "",
  region = "",
  when = "upcoming",
  page = 1,
} = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (region) params.set("region", region);
  if (when === "past") params.set("when", "past");
  if (page > 1) params.set("page", String(page));
  return `/card-shows${params.size ? `?${params}` : ""}`;
}

export function formatShowDate(date, options = {}) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(new Date(`${date}T12:00:00Z`));
}
