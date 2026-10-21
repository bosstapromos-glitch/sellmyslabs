import Image from "next/image";
import { Header, Footer } from "./components/Shell";
import Icon from "./components/Icon";
import { BUSINESS, GRADERS, FAQS } from "../lib/site";
export default function Home() {
  return (
    <>
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
              Turn your graded cards into your next possibility. Share your
              slabs. Get a personal offer from a real card shop.
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
              One card or a collection. No obligation to sell.
            </p>
            <div className="accepted">
              <span>WE ACCEPT</span>
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
                "Show us your slabs",
                "Add your card details and photos. Sending a collection? Keep everything in one request.",
              ],
              [
                "offer",
                "02",
                "Review your offer",
                "Our team reviews your cards and gets in touch. You decide whether the offer works for you.",
              ],
              [
                "box",
                "03",
                "Agree the details",
                "Confirm shipping, inspection and payment with us before sending your cards.",
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
              Start with my cards
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
