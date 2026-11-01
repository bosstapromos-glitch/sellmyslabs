"use client";
import { useState, useRef, useEffect } from "react";
import { requestJSON } from "../../../lib/request-json";
import { money } from "../../../lib/purchase-terms";
import PurchaseTerms from "../../components/PurchaseTerms";
import ShippingPanel from "./ShippingPanel";
import { journeyTime } from "../../../lib/shipping";

export default function OfferReview({ token, initialOffer }) {
  const [offer, setOffer] = useState(initialOffer);
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const message = useRef(null);
  const success = useRef(null);
  const snapshot = offer.snapshot;
  useEffect(() => {
    if (error) message.current?.focus();
  }, [error]);
  async function accept(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await requestJSON(`/api/offers/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          agree,
          termsVersion: snapshot.terms.version,
        }),
      });
      setOffer(result.offer);
      requestAnimationFrame(() => success.current?.focus());
    } catch (failure) {
      setError(failure.message);
      if (failure.status === 409) {
        try {
          const latest = await requestJSON(`/api/offers/${token}`);
          setOffer(latest.offer);
        } catch {
          /* Keep the visible offer and error. */
        }
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <span className="eyebrow">
        YOUR SELLMYSLABS OFFER · {snapshot.reference}
      </span>
      <h1>{offer.acceptedAt ? "Offer accepted." : "Review your offer."}</h1>
      <p>
        For {snapshot.sellerName} · from {snapshot.buyer.name}
      </p>
      {offer.acceptedAt ? (
        <section
          className="purchase-confirmation"
          role="status"
          ref={success}
          tabIndex={-1}
        >
          <h2>Your acceptance is saved.</h2>
          <p>
            Accepted by {offer.acceptedName} on{" "}
            <time dateTime={offer.acceptedAt}>
              {journeyTime(offer.acceptedAt)} MT
            </time>
            .
          </p>
          <p>
            {offer.receiptSent
              ? "A confirmation copy has been sent to your email and the shop."
              : "Your confirmation email is pending. Your acceptance is saved here; you do not need to accept again."}
          </p>
          <p>
            {offer.isCurrent
              ? "Keep this private link to view your shipping and purchase progress."
              : "A later offer has been issued. This is the record of your earlier acceptance; check the latest offer with the shop before shipping."}
          </p>
        </section>
      ) : !offer.canAccept ? (
        <div className="notice" role="status">
          <strong>This offer is no longer available to accept.</strong>
          <p>
            Check your latest offer email or contact the shop before shipping.
          </p>
        </div>
      ) : (
        <p>
          Check the items and terms below before accepting. If something is
          incorrect, contact the shop first.
        </p>
      )}
      {offer.acceptedAt && offer.isCurrent && <ShippingPanel token={token} />}
      <section className="purchase-summary" aria-label="Offer details">
        <div className="purchase-total">
          <span>Total for the listed collection</span>
          <strong>{money(snapshot.amount)}</strong>
        </div>
        <h2>Included items</h2>
        <ul className="purchase-items">
          {snapshot.items.map((item, index) => (
            <li key={index}>
              <strong>{item.name}</strong>
              <span>
                {item.details} · Qty {item.quantity}
                {item.cert && ` · Cert ${item.cert}`}
              </span>
              {item.condition && !item.details.includes(item.condition) && (
                <span>{item.condition}</span>
              )}
            </li>
          ))}
        </ul>
        {snapshot.message && (
          <section>
            <h3>A note about your offer</h3>
            <p className="preserve-lines">{snapshot.message}</p>
          </section>
        )}
      </section>
      <PurchaseTerms terms={snapshot.terms} />
      {offer.acceptedAt && (
        <section>
          <h2>Your agreement</h2>
          <p>{snapshot.statement}</p>
        </section>
      )}
      {offer.canAccept && (
        <form className="purchase-acceptance" onSubmit={accept}>
          <h2>Accept this offer</h2>
          <fieldset disabled={busy} className="form-fields">
            <label className="field">
              Full name
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={150}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="purchase-consent">
              <input
                type="checkbox"
                required
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              <span>{snapshot.statement}</span>
            </label>
            <button
              className="button"
              disabled={busy || !agree || name.trim().length < 2}
            >
              {busy ? "Saving acceptance…" : "Accept offer"}
            </button>
          </fieldset>
          <p className="hint">
            We’ll email a copy to the address used for your submission. No bank
            or payment-account details are needed here.
          </p>
        </form>
      )}
      {error && (
        <div className="error" role="alert" tabIndex={-1} ref={message}>
          {error}
        </div>
      )}
      <div className="purchase-contact">
        <button
          type="button"
          className="button secondary small"
          onClick={() => window.print()}
        >
          Print or save a copy
        </button>
        <p>
          Need help?{" "}
          <a className="text-link" href={`mailto:${snapshot.buyer.email}`}>
            Email the shop
          </a>{" "}
          or{" "}
          <a
            className="text-link"
            href={`tel:${snapshot.buyer.phone.replace(/[^+\d]/g, "")}`}
          >
            {snapshot.buyer.phone}
          </a>
          .
        </p>
      </div>
    </>
  );
}
