import snapshot from "../../lib/google-reviews.json";
import { BUSINESS } from "../../lib/site";
const date = (value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Boise" });
function Cards({ reviews }) {
  return <div className="google-review-grid">{reviews.map((review) => (
    <article className="google-review" key={review.id}>
      <div className="review-author"><span className="review-avatar" aria-hidden="true">{review.author.slice(0, 1).toUpperCase()}</span><strong>{review.author}</strong></div>
      <div className="review-stars" aria-label={`${review.rating} out of 5 stars`}><span aria-hidden="true">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div>
      {review.text ? <blockquote>“{review.text}”</blockquote> : <p className="hint">Rating only · no written review</p>}
      <time dateTime={review.date}>{date(review.date)}</time>
      <span className="review-source">Posted on Google</span>
    </article>
  ))}</div>;
}
export default function GoogleReviews() {
  return <section className="section wrap" id="reviews" aria-labelledby="reviews-heading">
    <div className="reviews-heading"><div><span className="eyebrow">FROM OUR COLLECTORS</span><h2 id="reviews-heading">Real people. Their words.</h2>
      <p>Google reviews for {BUSINESS.name}, the shop behind SellMySlabs.</p></div>
      <a className="button secondary" href={BUSINESS.google} target="_blank" rel="noreferrer">Read reviews on Google</a></div>
    <p className="hint">Latest {snapshot.reviews.length} reviews, newest first · Updated {date(snapshot.fetchedAt)}. Excerpts shown.</p>
    <Cards reviews={snapshot.reviews.slice(0, 4)} />
    <details className="more-reviews"><summary>Show all {snapshot.reviews.length} reviews<span aria-hidden="true">+</span></summary><Cards reviews={snapshot.reviews.slice(4)} /></details>
  </section>;
}
