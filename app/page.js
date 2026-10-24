import Image from "next/image";
import GoogleReviews from "./components/GoogleReviews";
export const metadata = { alternates: { canonical: "/" } };
const businessData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": "https://www.sellmyslabs.net/#website", name: "SellMySlabs", url: "https://www.sellmyslabs.net", publisher: { "@id": "https://www.sellmyslabs.net/#shop" } },
    { "@type": "Store", "@id": "https://www.sellmyslabs.net/#shop", name: "Lifestyle Cards & Collectibles", alternateName: "SellMySlabs", url: "https://www.sellmyslabs.net", telephone: "+1-208-613-5529", email: "lifestylecardandcollectibles@gmail.com", image: "https://www.sellmyslabs.net/opengraph-image", description: "Trading card shop in Twin Falls, Idaho. Buy and sell graded cards, raw cards and sealed products through SellMySlabs.", address: { "@type": "PostalAddress", streetAddress: "1339 Filer Ave E, Unit B", addressLocality: "Twin Falls", addressRegion: "ID", postalCode: "83301", addressCountry: "US" }, sameAs: ["https://share.google/e0YnqDkZi036YkURF"] }
  ]
};
import { Header, Footer } from "./components/Shell";
import Icon from "./components/Icon";
import { BUSINESS, GRADERS, FAQS } from "../lib/site";
export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(businessData).replace(/</g, "\\u003c") }} />
      <Header />
      <main id="main">
        <section className="hero wrap">
          <div className="hero-copy">
            <span className="eyebrow">
              FOR THE NEXT CHAPTER OF YOUR COLLECTION
            </span>
            <h1>
              Great cards.
              <br />
              <span>A simpler sale.</span>
            </h1>
            <p className="lead">
              Sell your graded cards, raw Pokémon and sports cards, or sealed products with a personal offer
              from Lifestyle Cards & Collectibles in Twin Falls, Idaho. One card
              or a whole collection—we’ll help you take the next step.
            </p>
            <div className="actions">
              <a className="button" href="/sell">
                Get my offer
              </a>
              <a className="text-link" href="#how-it-works">
                See how it works
              </a>
            </div>
            <p className="micro">
              Graded cards. Raw cards. Sealed products. No obligation to sell.
            </p>
            <div className="accepted">
              <span>GRADED CARDS WE ACCEPT</span>
              <div>
                {GRADERS.map((g) => (
                  <strong key={g}>
                    {g}
                    {g === "TAG" && <small>NEW</small>}
                  </strong>
                ))}
              </div>
            </div>
          </div>
          <figure className="hero-art">
            <div className="art-orbit" />
            <Image
              src="/images/tag-charizard.jpg"
              alt="Real TAG graded Charizard ex card in its clear protective slab"
              width={1912}
              height={3400}
              sizes="(max-width: 700px) 80vw, 460px"
              priority
            />
            <figcaption>
              <span>Real cards. Real potential.</span>
            </figcaption>
          </figure>
        </section>
        <div className="trust-strip">
          <div className="wrap">
            <span>
              <Icon name="shop" />A real shop in Twin Falls, Idaho
            </span>
            <a href={BUSINESS.google} target="_blank" rel="noreferrer">
              <Icon name="star" />
              Meet us on Google
            </a>
            <span>
              <Icon name="chat" />
              Personal offers. Human support.
            </span>
          </div>
        </div>
        <section className="section wrap" id="how-it-works">
          <div className="section-heading">
            <span className="eyebrow">LESS EFFORT. MORE CLARITY.</span>
            <h2>
              Your next move,
              <br />
              in three simple steps.
            </h2>
          </div>
          <div className="steps">
            {[
              [
                "cards",
                "01",
                "Show us what you have",
                "Add your card or sealed-product details and photos. Sending a collection? Keep everything in one request.",
              ],
              [
                "offer",
                "02",
                "Review your offer",
                "Our team reviews your items and gets in touch. You decide whether the offer works for you.",
              ],
              [
                "box",
                "03",
                "Agree the details",
                "Confirm shipping, inspection and payment with us before sending your items.",
              ],
            ].map(([icon, n, title, copy]) => (
              <article key={n}>
                <div className="step-top">
                  <Icon name={icon} />
                  <span>{n}</span>
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
          <div className="center">
            <a className="button" href="/sell">
              Start my request
            </a>
          </div>
        </section>
        <section className="shop-section" id="our-shop">
          <div className="wrap shop-grid">
            <div>
              <span className="eyebrow">COLLECTORS, JUST LIKE YOU.</span>
              <h2>
                A real shop.
                <br />
                People you can reach.
              </h2>
              <p className="lead">
                SellMySlabs is part of {BUSINESS.name}. Behind every offer is
                our team in Twin Falls, Idaho.
              </p>
              <a
                className="button secondary"
                href={BUSINESS.google}
                target="_blank"
                rel="noreferrer"
              >
                Visit our Google page
              </a>
            </div>
            <div className="shop-card">
              <Icon name="shop" />
              <h3>{BUSINESS.name}</h3>
              <p>{BUSINESS.address}</p>
              <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>
              <div className="divider" />
              <p>
                Have a question about your collection?
                <br />
                We’re here to help you take the next step.
              </p>
              <a className="text-link" href={`mailto:${BUSINESS.email}`}>
                Email our team
              </a>
            </div>
          </div>
        </section>
        <GoogleReviews />
        <section className="section wrap faq-grid" id="faq">
          <div>
            <span className="eyebrow">A LITTLE MORE CLARITY</span>
            <h2>
              Good questions.
              <br />
              Straight answers.
            </h2>
          </div>
          <div>
            {FAQS.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="final-cta wrap">
          <span className="eyebrow">READY WHEN YOU ARE</span>
          <h2>Let’s see what you’ve got.</h2>
          <p>A single favorite or a whole collection. Start here.</p>
          <a href="/sell" className="button">
            Request an offer
          </a>
        </section>
      </main>
      <Footer />
    </>
  );
}
