import Brand from "./Brand";
import { BUSINESS } from "../../lib/site";

export function Header({ context }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <nav aria-label="Main navigation">
          {context ? (
            <a
              className="text-link header-context"
              href={
                context === "owner"
                  ? "/"
                  : context === "account"
                    ? "/sell"
                    : BUSINESS.phoneHref
              }
              target={context === "owner" ? "_blank" : undefined}
              rel={context === "owner" ? "noopener noreferrer" : undefined}
            >
              {context === "owner"
                ? "View website ↗"
                : context === "account"
                  ? "New request"
                  : "Need help?"}
            </a>
          ) : (
            <>
              <a className="nav-text" href="/#how-it-works">
                How it works
              </a>
              <a className="nav-text" href="/#our-shop">
                Our shop
              </a>
              <a className="button small" href="/sell">
                Request an offer
              </a>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
export function Footer({ compact = false }) {
  if (compact)
    return (
      <footer className="task-footer wrap">
        <span>SellMySlabs · {BUSINESS.name}</span>
        <div>
          <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            Privacy
          </a>
          <a href="/purchase-terms" target="_blank" rel="noopener noreferrer">
            Purchase terms
          </a>
        </div>
      </footer>
    );
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
          <a href="/purchase-terms">Purchase terms</a>
          <a href="/sign-in">Sign in</a>
        </div>
      </div>
    </footer>
  );
}
