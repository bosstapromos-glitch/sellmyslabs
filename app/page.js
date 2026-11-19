import Image from "next/image";
import GoogleReviews from "./components/GoogleReviews";
import InspectionNotice from "./components/InspectionNotice";
import JsonLd, { faqSchema } from "./components/JsonLd";
import snapshot from "../lib/google-reviews.json";
import { BUY_GUIDES } from "../lib/sell-guides";
export const metadata = { alternates: { canonical: "/" } };
const businessGraph = [
    {
      "@type": "WebSite",
      "@id": "https://www.sellmyslabs.net/#website",
      name: "SellMySlabs",
      url: "https://www.sellmyslabs.net",
      publisher: { "@id": "https://www.sellmyslabs.net/#shop" },
    },
    {
      "@type": "Store",
      "@id": "https://www.sellmyslabs.net/#shop",
      name: "Lifestyle Cards & Collectibles",
      alternateName: "SellMySlabs",
      url: "https://www.sellmyslabs.net",
      telephone: "+1-208-613-5529",
      email: "lifestylecardandcollectibles@gmail.com",
      image: "https://www.sellmyslabs.net/opengraph-image",
      description:
        "Trading card shop in Twin Falls, Idaho. Buy and sell graded cards, raw cards and sealed products through SellMySlabs.",
      address: {
        "@type": "PostalAddress",
        streetAddress: "1339 Filer Ave E, Unit B",
        addressLocality: "Twin Falls",
        addressRegion: "ID",
        postalCode: "83301",
        addressCountry: "US",
      },
      sameAs: ["https://share.google/e0YnqDkZi036YkURF"],
    },
];
import { Header, Footer } from "./components/Shell";
import Icon from "./components/Icon";
import { BUSINESS, FAQS } from "../lib/site";
import GraderLogos from "./components/GraderLogos";
const fiveStar = snapshot.reviews.filter((r) => r.rating === 5).length;
export default function Home() {
  return (
    <>
      <JsonLd graph={[...businessGraph, faqSchema(FAQS)]} />
      <Header />
      <main id="main">
        <section className="hero wrap">
          <div className="hero-copy">
            <h1>
              <span className="h1-kicker">
                Sell graded cards, Pokémon, sports cards &amp; sealed products
              </span>
              Great cards.
              <br />
              <span>A simpler sale.</span>
            </h1>
            <p className="lead">
              Get a personal offer from the team at {BUSINESS.name}, a real
              card shop in Twin Falls, Idaho.
            </p>
            <div className="actions">
              <a className="button" href="/sell">
                Request an offer
              </a>
              <a className="text-link" href="#how-it-works">
                See how it works
              </a>
            </div>
            <p className="micro">No obligation to sell.</p>
            <div className="accepted">
              <span>GRADED CARDS WE ACCEPT</span>
              <GraderLogos />
            </div>
          </div>
          <figure className="hero-art">
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
        <section className="proof" aria-label="What to expect">
          <dl className="wrap">
            <div>
              <dt>24 hours</dt>
              <dd>Typical reply with an offer or an update</dd>
            </div>
            <div>
              <dt>Same day</dt>
              <dd>Payment initiated once inspection confirms your items</dd>
            </div>
            <div>
              <dt>{fiveStar} five-star</dt>
              <dd>
                <a href={BUSINESS.google} target="_blank" rel="noreferrer">
                  Google ratings for our shop
                </a>
              </dd>
            </div>
            <div>
              <dt>No obligation</dt>
              <dd>You decide whether the offer works for you</dd>
            </div>
          </dl>
        </section>
        <section className="section wrap" aria-labelledby="buy-heading">
          <div className="section-heading">
            <h2 id="buy-heading">What we buy.</h2>
            <p>
              Single cards or whole collections. Choose a category to see what
              to send us.
            </p>
          </div>
          <ul className="buy-grid">
            {BUY_GUIDES.map((guide) => (
              <li key={guide.slug}>
                <a href={`/${guide.slug}`}>
                  <strong>{guide.label}</strong>
                  <span>{guide.blurb}</span>
                  <em aria-hidden="true">→</em>
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section className="section wrap" id="how-it-works">
          <div className="section-heading">
            <h2>Sell in three steps.</h2>
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
          <InspectionNotice />
          <div className="center">
            <a className="button" href="/sell">
              Request an offer
            </a>
          </div>
        </section>
        <section className="consign-band" aria-labelledby="consignment-heading">
          <div className="wrap consign-grid">
            <div>
              <h2 id="consignment-heading">Prefer to consign?</h2>
              <p className="lead">
                We can offer your graded cards, raw cards and sealed products
                in-store and on eBay.
              </p>
              <div className="actions">
                <a className="button secondary" href="/consignment">
                  Explore consignment
                </a>
                <a className="text-link" href="/sell-or-consign-cards">
                  Sell or consign?
                </a>
              </div>
            </div>
            <ul className="consign-points">
              <li>
                <strong>Your price</strong>
                <span>Set a target price for each item.</span>
              </li>
              <li>
                <strong>Two places to sell</strong>
                <span>Offered in our store and on eBay.</span>
              </li>
              <li>
                <strong>Your approval</strong>
                <span>Review buyer offers before accepting a sale.</span>
              </li>
            </ul>
          </div>
        </section>
        <section className="shop-section" id="our-shop">
          <div className="wrap shop-grid">
            <div>
              <span className="eyebrow">TWIN FALLS, IDAHO</span>
              <h2>Visit our shop.</h2>
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
                Call or email our team.
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
            <h2>Questions before you sell?</h2>
            <p>
              Can’t find your answer? Call{" "}
              <a className="text-link" href={BUSINESS.phoneHref}>
                {BUSINESS.phone}
              </a>{" "}
              or{" "}
              <a className="text-link" href={`mailto:${BUSINESS.email}`}>
                email our team
              </a>
              .
            </p>
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
          <h2>Let’s see what you’ve got.</h2>
          <p>Send your item details and photos. We’ll take a look.</p>
          <a href="/sell" className="button">
            Request an offer
          </a>
        </section>
      </main>
      <Footer />
    </>
  );
}
