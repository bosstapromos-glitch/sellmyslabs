import Brand from "./Brand";
import { BUSINESS } from "../../lib/site";

export function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <nav aria-label="Main navigation">
          <a className="nav-text" href="/#how-it-works">
            How it works
          </a>
          <a className="nav-text" href="/#our-shop">
            Our shop
          </a>
          <a className="button small" href="/sell">
            Request an offer
          </a>
        </nav>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <Brand />
          <p>
            Cards & collectibles. Real people.
            <br />
            Operated by {BUSINESS.name}.
          </p>
        </div>
        <div>
          <h2>Visit our shop</h2>
          <a href={BUSINESS.google} target="_blank" rel="noreferrer">
            {BUSINESS.address}
          </a>
          <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>
        </div>
        <div>
          <h2>Here to help</h2>
          <a href="/#faq">Common questions</a>
          <a href={BUSINESS.google} target="_blank" rel="noreferrer">
            Read our Google reviews
          </a>
          <a href={`mailto:${BUSINESS.email}`}>Email the team</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} SellMySlabs</span>
        <div>
          <a href="/privacy">Privacy</a>
          <a href="/admin">Staff workspace</a>
        </div>
      </div>
    </footer>
  );
}
