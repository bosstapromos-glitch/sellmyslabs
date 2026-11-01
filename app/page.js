import Image from "next/image";
import GoogleReviews from "./components/GoogleReviews";
export const metadata = { alternates: { canonical: "/" } };
const businessData = {
  "@context": "https://schema.org",
  "@graph": [
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
  ],
};
import { Header, Footer } from "./components/Shell";
import Icon from "./components/Icon";
import { BUSINESS, GRADERS, FAQS } from "../lib/site";
export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(businessData).replace(/</g, "\\u003c"),
        }}
      />
      <Header />
      <main id="main">
        <section className="hero wrap">
          <div className="hero-copy">
            <span className="eyebrow">LIFESTYLE CARDS & COLLECTIBLES</span>
            <h1>
              Great cards.
              <br />
              <span>A simpler sale.</span>
            </h1>
            <p className="lead">
              Sell graded cards, raw cards and sealed products. Get a personal
              offer from our team in Twin Falls, Idaho.
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
              <div>
                {GRADERS.map((g) => (
                  <strong key={g}>{g}</strong>
                ))}
              </div>
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
          <div className="center">
            <a className="button" href="/sell">
              Request an offer
            </a>
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
