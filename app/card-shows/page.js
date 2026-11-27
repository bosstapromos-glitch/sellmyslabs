import { Header, Footer } from "../components/Shell";
import {
  directoryDay,
  formatShowDate,
  loadShowDirectory,
  selectShows,
  showDirectoryUrl,
} from "../../lib/card-shows";
import styles from "./shows.module.css";

const title = "Card Show Directory";
const description =
  "Find card shows by city, state or show name. Browse dates, venues and organizer links from the Lifestyle card-show directory.";
export const metadata = {
  title,
  description,
  alternates: { canonical: "/card-shows" },
  openGraph: {
    title: `${title} | SellMySlabs`,
    description,
    url: "/card-shows",
  },
};

export default async function CardShows({ searchParams }) {
  const [params, data] = await Promise.all([searchParams, loadShowDirectory()]);
  const today = directoryDay();
  const result = selectShows(data.shows, params, today);
  const regions = [
    ...new Map(
      data.shows
        .filter((s) => s.regionLabel)
        .map((s) => [s.region, s.regionLabel]),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const hasUpcoming = data.shows.some((show) => show.date >= today);
  return (
    <>
      <Header />
      <main id="main" className={`wrap ${styles.page}`}>
        <div className={styles.intro}>
          <a href="/" className={styles.back}>
            ← SellMySlabs
          </a>
          <p className={styles.eyebrow}>THE COLLECTOR COMMUNITY</p>
          <h1>Find your next card show.</h1>
          <p className={styles.lead}>
            Browse shows by location, date or name. Find a place to meet
            collectors and see cards in person.
          </p>
        </div>
        {data.unavailable ? (
          <section className={styles.empty} aria-labelledby="unavailable-title">
            <h2 id="unavailable-title">The directory couldn’t load.</h2>
            <p>
              Please try again in a moment. Your submissions and offers are
              still available.
            </p>
            <a className="button secondary" href={showDirectoryUrl(result)}>
              Try again
            </a>
          </section>
        ) : (
          <>
            <form
              className={styles.filters}
              action="/card-shows"
              method="get"
              role="search"
              aria-label="Find a card show"
            >
              <label className={styles.search}>
                Search shows
                <input
                  type="search"
                  name="q"
                  defaultValue={result.q}
                  maxLength={100}
                  placeholder="Show name, city or venue"
                />
              </label>
              <label>
                State or region
                <select name="region" defaultValue={result.region}>
                  <option value="">All locations</option>
                  {regions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Dates
                <select name="when" defaultValue={result.when}>
                  <option value="upcoming">Upcoming shows</option>
                  <option value="past">Past shows</option>
                </select>
              </label>
              <button className="button" type="submit">
                Find shows
              </button>
            </form>
            <div className={styles.resultsHeading}>
              <h2>
                {result.when === "past" ? "Past shows" : "Upcoming shows"}{" "}
                <span>({result.total.toLocaleString("en-US")})</span>
              </h2>
              {(result.q || result.region || result.when === "past") && (
                <a className="text-link" href="/card-shows">
                  Reset filters
                </a>
              )}
            </div>
            {result.when === "past" && (
              <p className={styles.notice}>
                These dates have passed. Past listings don’t confirm a future
                event.
              </p>
            )}
            {!result.shows.length ? (
              <section className={styles.empty}>
                <h3>
                  {result.when === "upcoming" && !hasUpcoming
                    ? "New show dates haven’t been added yet."
                    : "No shows match these filters."}
                </h3>
                <p>
                  {result.when === "upcoming" && !hasUpcoming
                    ? "You can browse past listings while the Lifestyle directory awaits its next update."
                    : "Try a different location or a shorter search."}
                </p>
                <a
                  className="button secondary"
                  href={
                    result.when === "upcoming" && !hasUpcoming
                      ? "/card-shows?when=past"
                      : showDirectoryUrl({ when: result.when })
                  }
                >
                  {result.when === "upcoming" && !hasUpcoming
                    ? "Browse past shows"
                    : "Clear search and location"}
                </a>
              </section>
            ) : (
              <ul className={styles.list}>
                {result.shows.map((show) => (
                  <li key={show.id} className={styles.event}>
                    <time dateTime={show.date} className={styles.date}>
                      <span>
                        {formatShowDate(show.date, {
                          month: "short",
                          day: undefined,
                          year: undefined,
                        })}
                      </span>
                      <strong>{show.date.slice(8).replace(/^0/, "")}</strong>
                      <span>{show.date.slice(0, 4)}</span>
                    </time>
                    <div className={styles.details}>
                      <p className={styles.location}>
                        {show.location ||
                          [show.city, show.regionLabel]
                            .filter(Boolean)
                            .join(", ")}
                      </p>
                      <h3>{show.title}</h3>
                      <p>{show.venue || "Venue not listed"}</p>
                      <p className={styles.time}>
                        {formatShowDate(show.date, { weekday: "long" })}
                        {show.time ? ` · ${show.time}` : " · Hours not listed"}
                      </p>
                      <div className={styles.links}>
                        {show.url && (
                          <a
                            href={show.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View listing ↗
                            <span className={styles.srOnly}>
                              {" "}
                              for {show.title}
                            </span>
                          </a>
                        )}
                        {show.website && show.website !== show.url && (
                          <a
                            href={show.website}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Organizer website ↗
                            <span className={styles.srOnly}>
                              {" "}
                              for {show.title}
                            </span>
                          </a>
                        )}
                        {show.address && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(show.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Directions ↗
                            <span className={styles.srOnly}>
                              {" "}
                              to {show.title}
                            </span>
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {result.pages > 1 && (
              <nav
                className={styles.pagination}
                aria-label="Show directory pages"
              >
                {result.page > 1 ? (
                  <a
                    className="button secondary"
                    href={showDirectoryUrl({
                      ...result,
                      page: result.page - 1,
                    })}
                  >
                    Previous
                  </a>
                ) : (
                  <span />
                )}
                <span>
                  Page {result.page} of {result.pages}
                </span>
                {result.page < result.pages ? (
                  <a
                    className="button secondary"
                    href={showDirectoryUrl({
                      ...result,
                      page: result.page + 1,
                    })}
                  >
                    Next
                  </a>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        )}
        <aside className={styles.source}>
          <p>
            Listings from the Lifestyle card-show directory.
            {data.importedOn
              ? ` Last source update: ${formatShowDate(data.importedOn)}.`
              : ""}
          </p>
          <p>
            Check the original listing for current dates, hours and admission
            before making travel plans. Listings do not imply SellMySlabs is
            hosting or attending.
          </p>
        </aside>
      </main>
      <Footer />
    </>
  );
}
