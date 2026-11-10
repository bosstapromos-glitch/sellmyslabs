"use client";
import { useState, useRef, useEffect } from "react";
import ConsignmentResponseForm from "./ConsignmentResponseForm";
import ConsignmentResponseDetails from "../../../components/ConsignmentResponseDetails";
import { responseLabel } from "../../../../lib/consignment-response";
import styles from "../../../components/ConsignmentOffer.module.css";
import { requestJSON } from "../../../../lib/request-json";
import { journeyTime } from "../../../../lib/shipping";
import ConsignmentOfferDetails from "../../../components/ConsignmentOfferDetails";
export default function ConsignmentReview({ token, initialOffer }) {
  const [offer, setOffer] = useState(initialOffer),
    [name, setName] = useState(""),
    [agree, setAgree] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [responseMode, setResponseMode] = useState("");
  const notice = useRef(null),
    success = useRef(null);
  const s = offer.snapshot,
    label = s.kind === "arrangement" ? "arrangement" : "buyer offer";
  useEffect(() => {
    if (error) notice.current?.focus();
  }, [error]);
  async function send(payload) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await requestJSON(`/api/consignment/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, termsVersion: s.terms.version }),
      });
      setOffer(result.offer);
      setResponseMode("");
      requestAnimationFrame(() => success.current?.focus());
    } catch (e) {
      setError(e.message);
      if (e.status === 409)
        try {
          const d = await requestJSON(`/api/consignment/${token}`);
          setOffer(d.offer);
        } catch {}
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <a className="plain-button" href="/account">
        ← Your account
      </a>
      <span className="eyebrow">CONSIGNMENT · {s.reference}</span>
      <h1>
        {offer.response
          ? `${responseLabel(offer.response.action)}.`
          : offer.acceptedAt
            ? `${s.kind === "arrangement" ? "Arrangement" : "Buyer offer"} accepted.`
            : `Review your ${label}.`}
      </h1>
      <p>
        For {s.sellerName} · from {s.shop.name}
      </p>
      {offer.response ? (
        <section ref={success} tabIndex={-1} role="status">
          <ConsignmentResponseDetails
            response={offer.response}
            name={offer.responseName}
            at={offer.respondedAt}
          />
          <p>
            {offer.response.action === "decline"
              ? "Your decline is recorded. Any new offer will appear in your account."
              : "The shop will review your request. Any revised offer or arrangement will appear here for your approval."}
          </p>
          <p className="hint">
            {offer.responseReceiptSent
              ? "A copy of your response has been sent to you and the shop."
              : "Your response is saved. Its confirmation email is pending; you do not need to submit again."}
          </p>
          {!offer.isCurrent && (
            <p>
              This is an earlier response. Open your account for the latest
              version.
            </p>
          )}
        </section>
      ) : offer.acceptedAt ? (
        <section
          className="purchase-confirmation"
          role="status"
          tabIndex={-1}
          ref={success}
        >
          <h2>Your acceptance is saved.</h2>
          <p>
            Accepted by {offer.acceptedName} on {journeyTime(offer.acceptedAt)}{" "}
            MT.
          </p>
          <p>
            {offer.receiptSent
              ? "A confirmation copy has been sent to you and the shop."
              : "Your confirmation email is pending. Your acceptance is saved; you do not need to accept again."}
          </p>
          <p>
            {s.kind === "arrangement"
              ? "Confirm delivery arrangements with the shop before sending items. Buyer offers will come here for your approval."
              : "The shop can proceed with the approved sale. Payout follows receipt of the buyer’s payment."}
          </p>
          {!offer.isCurrent && (
            <p>
              This is an earlier acceptance record. Check the latest arrangement
              or offer in your account for any changes.
            </p>
          )}
        </section>
      ) : !offer.canAccept ? (
        <div className="notice" role="status">
          This version is no longer available to accept. Open the latest version
          in your account or contact the shop.
        </div>
      ) : (
        <p>
          Review the items and details below, then accept, decline, or send a
          response to the shop.
        </p>
      )}
      {offer.response && <h2>Original {label}</h2>}
      <ConsignmentOfferDetails snapshot={s} />
      {offer.canAccept && !responseMode ? (
        <form
          className="purchase-acceptance"
          onSubmit={(e) => {
            e.preventDefault();
            send({ name, agree });
          }}
        >
          <h2>Accept this {label}</h2>
          <fieldset className="form-fields" disabled={busy}>
            <label className="field">
              Full name
              <input
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
              <span>{s.statement}</span>
            </label>
            <button
              className="button"
              disabled={busy || !agree || name.trim().length < 2}
            >
              {busy ? "Saving acceptance…" : `Accept ${label}`}
            </button>
          </fieldset>
        </form>
      ) : (
        offer.acceptedAt && (
          <section>
            <h2>Your agreement</h2>
            <p>{s.statement}</p>
          </section>
        )
      )}
      {offer.canAccept && !responseMode && (
        <div className={styles.controls}>
          <button
            className="button secondary"
            type="button"
            disabled={busy}
            onClick={() => {
              setError("");
              setResponseMode(s.kind === "sale" ? "counter" : "changes");
            }}
          >
            {s.kind === "sale" ? "Counter offer" : "Request changes"}
          </button>
          <button
            className="plain-button"
            type="button"
            disabled={busy}
            onClick={() => {
              setError("");
              setResponseMode("decline");
            }}
          >
            Decline
          </button>
        </div>
      )}
      {offer.canAccept && responseMode && (
        <ConsignmentResponseForm
          key={responseMode}
          mode={responseMode}
          snapshot={s}
          initialName={name}
          busy={busy}
          onSubmit={send}
          onCancel={() => {
            setResponseMode("");
            setError("");
          }}
        />
      )}
      {error && (
        <p className="error" role="alert" ref={notice} tabIndex={-1}>
          {error}
        </p>
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
          <a className="text-link" href={`mailto:${s.shop.email}`}>
            Email the shop
          </a>{" "}
          or{" "}
          <a
            className="text-link"
            href={`tel:${s.shop.phone.replace(/[^+\d]/g, "")}`}
          >
            {s.shop.phone}
          </a>
          .
        </p>
      </div>
    </>
  );
}
