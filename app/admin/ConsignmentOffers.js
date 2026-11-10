"use client";
import { useState, useEffect, useRef } from "react";
import ConsignmentResponseDetails from "../components/ConsignmentResponseDetails";
import { requestJSON } from "../../lib/request-json";
import { consignmentSnapshot } from "../../lib/consignment-offer";
import { journeyTime } from "../../lib/shipping";
import ConsignmentOfferDetails from "../components/ConsignmentOfferDetails";
import styles from "../components/ConsignmentOffer.module.css";
export default function ConsignmentOffers({
  submission,
  disabled,
  onDirty,
  onPublished,
}) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [mode, setMode] = useState(""),
    [message, setMessage] = useState(""),
    [channel, setChannel] = useState("In store"),
    [lines, setLines] = useState([]),
    [preview, setPreview] = useState(null),
    [busy, setBusy] = useState(false);
  const errorRef = useRef(null),
    previewRef = useRef(null),
    editRef = useRef(null);
  useEffect(() => {
    if (mode && !preview) editRef.current?.focus();
  }, [mode, preview]);
  useEffect(() => {
    onDirty(!!mode);
    return () => onDirty(false);
  }, [mode, onDirty]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  async function load() {
    setError("");
    try {
      setData(await requestJSON(`/api/admin/consignment?id=${submission.id}`));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    let active = true;
    requestJSON(`/api/admin/consignment?id=${submission.id}`)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [submission.id]);
  function begin(kind, source) {
    setError("");
    setMode(kind);
    setPreview(null);
    setMessage("");
    if (source) setChannel(source.snapshot.channel);
    setLines(
      submission.cards.map((c, itemIndex) => {
        const quoted = source?.snapshot.lines.find(
          (l) => l.itemIndex === itemIndex,
        );
        const counter = source?.response.lines.find(
          (l) => l.itemIndex === itemIndex,
        );
        return {
          itemIndex,
          selected: !!quoted,
          quantity: quoted?.quantity ?? data.remaining[itemIndex],
          listingType:
            quoted?.listingType ??
            (c.itemType === "Sealed product"
              ? "sealed"
              : data.remaining[itemIndex] > 1
                ? "lot"
                : "single"),
          salePrice: counter ? (counter.saleCents / 100).toFixed(2) : "",
          marketplaceFees: quoted ? (quoted.feeCents / 100).toFixed(2) : "0",
        };
      }),
    );
  }
  const currentArrangement = data?.offers.find(
    (o) => o.id === data.arrangementId,
  );
  const input = {
    id: submission.id,
    editVersion: data?.editVersion ?? submission.edit_version,
    kind: mode,
    message,
    channel,
    lines: lines
      .filter((l) => l.selected)
      .map(({ selected, ...l }) => ({ ...l, quantity: Number(l.quantity) })),
  };
  function review(e) {
    e.preventDefault();
    setError("");
    try {
      setPreview(consignmentSnapshot(submission, input, data.remaining));
      requestAnimationFrame(() => {
        previewRef.current?.focus();
        previewRef.current?.scrollIntoView({ block: "start" });
      });
    } catch (e) {
      setError(e.issues?.[0]?.message || e.message);
    }
  }
  async function publish() {
    if (busy || disabled) return;
    setBusy(true);
    setError("");
    try {
      await requestJSON("/api/admin/consignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      setMode("");
      setPreview(null);
      onDirty(false);
      await onPublished();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function retry(emailId) {
    setBusy(true);
    try {
      await requestJSON("/api/admin/consignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", id: submission.id, emailId }),
      });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function patch(i, key, value) {
    setLines((all) =>
      all.map((l, j) => (j === i ? { ...l, [key]: value } : l)),
    );
  }
  return (
    <section
      id="consignment-approvals"
      className="panel"
      aria-labelledby="consignment-offers-heading"
    >
      <h2 id="consignment-offers-heading">Consignment approvals</h2>
      <p>
        Send the arrangement first. Once the seller accepts, send buyer offers
        for their approval here.
      </p>
      {!data && !error && <p role="status">Loading approvals…</p>}
      {disabled && (
        <p className="notice">
          Save your status or private-note changes before sending an approval.
        </p>
      )}
      {data && !mode && (
        <>
          <div className={styles.controls}>
            <button
              type="button"
              className="button secondary"
              disabled={
                busy ||
                disabled ||
                ["Closed", "Paid"].includes(submission.status)
              }
              onClick={() => begin("arrangement")}
            >
              {currentArrangement
                ? "Revise arrangement"
                : "Prepare arrangement"}
            </button>
            <button
              type="button"
              className="button"
              disabled={
                busy ||
                disabled ||
                !currentArrangement?.accepted_at ||
                ["Closed", "Paid"].includes(submission.status) ||
                !data.remaining.some((q) => q > 0)
              }
              onClick={() => begin("sale")}
            >
              Prepare buyer offer
            </button>
            <button
              type="button"
              className="plain-button"
              disabled={busy}
              onClick={onPublished}
            >
              Refresh approvals
            </button>
          </div>
          {!currentArrangement?.accepted_at && (
            <p className="hint">
              The current arrangement must be accepted before a buyer offer can
              be sent.
            </p>
          )}
        </>
      )}
      {mode && !preview && (
        <form onSubmit={review}>
          <h3 ref={editRef} tabIndex={-1}>
            {mode === "arrangement" ? "Consignment arrangement" : "Buyer offer"}
          </h3>
          <fieldset className="form-fields" disabled={busy || disabled}>
            {mode === "arrangement" ? (
              <p>
                The seller will review all {submission.cards.length} item
                entries, their target prices, payout tiers, listing fees,
                delivery responsibilities and payment timing. A revised
                arrangement replaces pending approval links.
              </p>
            ) : (
              <>
                <label className="field">
                  Sales channel
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  >
                    <option>In store</option>
                    <option>eBay</option>
                  </select>
                </label>
                <p className="hint">
                  Select the items in this buyer offer. Enter one total sale
                  price and estimated fees per listing. Previously approved
                  quantities are excluded.
                </p>
                {lines.map((l, i) => (
                  <div className={styles.line} key={i}>
                    <label className={styles.choice}>
                      <input
                        type="checkbox"
                        checked={l.selected}
                        disabled={!data.remaining[i]}
                        onChange={(e) => patch(i, "selected", e.target.checked)}
                      />
                      {submission.cards[i].name}
                    </label>
                    <p>
                      {data.remaining[i]} available
                      {submission.cards[i].asking
                        ? ` · Seller target $${submission.cards[i].asking} each`
                        : ""}
                    </p>
                    {l.selected && (
                      <div className={styles.grid}>
                        <label className="field">
                          Quantity
                          <input
                            aria-label={`Quantity for ${submission.cards[i].name}`}
                            type="number"
                            min="1"
                            max={data.remaining[i]}
                            required
                            value={l.quantity}
                            onChange={(e) =>
                              patch(i, "quantity", e.target.value)
                            }
                          />
                        </label>
                        <label className="field">
                          Listing type
                          <select
                            aria-label={`Listing type for ${submission.cards[i].name}`}
                            value={l.listingType}
                            onChange={(e) =>
                              patch(i, "listingType", e.target.value)
                            }
                          >
                            {submission.cards[i].itemType ===
                            "Sealed product" ? (
                              <option value="sealed">
                                Sealed product · $9.99 fee
                              </option>
                            ) : (
                              <>
                                <option value="single">
                                  Single · $0.99 fee
                                </option>
                                <option value="lot">Lot · $2.99 fee</option>
                              </>
                            )}
                          </select>
                        </label>
                        <label className="field">
                          Sale price for this listing (USD)
                          <input
                            aria-label={`Sale price for ${submission.cards[i].name}`}
                            inputMode="decimal"
                            required
                            value={l.salePrice}
                            maxLength={20}
                            onChange={(e) =>
                              patch(i, "salePrice", e.target.value)
                            }
                          />
                        </label>
                        <label className="field">
                          Estimated marketplace/payment fees (USD)
                          <input
                            aria-label={`Estimated fees for ${submission.cards[i].name}`}
                            inputMode="decimal"
                            required
                            maxLength={20}
                            value={l.marketplaceFees}
                            onChange={(e) =>
                              patch(i, "marketplaceFees", e.target.value)
                            }
                          />
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
            <label className="field">
              Message to seller <span className="hint">Optional</span>
              <textarea
                value={message}
                maxLength={3000}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            <div className={styles.controls}>
              <button className="button">Review before sending</button>
              <button
                type="button"
                className="plain-button"
                onClick={() => setMode("")}
              >
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {preview && (
        <>
          <h3 ref={previewRef} tabIndex={-1}>
            Review what the seller will receive
          </h3>
          <ConsignmentOfferDetails snapshot={preview} />
          <p>{preview.statement}</p>
          <p className="hint">
            Publishing adds this approval to the seller’s account and emails a
            private link, with a copy to you. Earlier pending links for the same
            approval are replaced.
          </p>
          <div className={styles.controls}>
            <button
              type="button"
              className="button"
              disabled={busy || disabled}
              onClick={publish}
            >
              {busy
                ? "Publishing…"
                : mode === "arrangement"
                  ? "Send arrangement"
                  : "Send buyer offer"}
            </button>
            <button
              type="button"
              className="plain-button"
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              Back to edit
            </button>
          </div>
        </>
      )}
      {error && (
        <div className="error" role="alert" ref={errorRef} tabIndex={-1}>
          {error}
          {!data && (
            <button type="button" className="plain-button" onClick={load}>
              Try again
            </button>
          )}
        </div>
      )}
      {data && (
        <ul className={styles.history}>
          {data.offers.map((o) => (
            <li key={o.id}>
              <strong>
                {o.kind === "arrangement"
                  ? "Consignment arrangement"
                  : "Buyer offer"}
              </strong>
              {!o.response && (
                <p>
                  {o.accepted_at
                    ? `Accepted by ${o.accepted_name} · ${journeyTime(o.accepted_at)} MT`
                    : o.withdrawn_at || !o.is_current
                      ? "Replaced — cannot be accepted"
                      : "Awaiting seller acceptance"}
                </p>
              )}
              {o.response && (
                <>
                  <ConsignmentResponseDetails
                    response={o.response}
                    name={o.response_name}
                    at={o.responded_at}
                  />
                  {o.response.action === "counter" &&
                    o.is_current &&
                    !mode &&
                    currentArrangement?.accepted_at && (
                      <>
                        <button
                          type="button"
                          className="button secondary small"
                          disabled={
                            busy ||
                            disabled ||
                            ["Closed", "Paid"].includes(submission.status)
                          }
                          onClick={() => begin("sale", o)}
                        >
                          Prepare revised offer
                        </button>
                        <p className="hint">
                          Start with the seller’s proposed prices, confirm the
                          buyer’s agreement and updated fees, then send a
                          revised offer for acceptance.
                        </p>
                      </>
                    )}
                </>
              )}
              <a
                className="text-link"
                href={o.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {o.response
                  ? "View response record"
                  : o.accepted_at
                    ? "View acceptance record"
                    : "View seller’s approval page"}{" "}
                ↗
              </a>
              {o.emails.map((e) => (
                <p className="hint" key={e.id}>
                  {e.kind === "offer"
                    ? "Notification"
                    : e.kind === "response"
                      ? "Response confirmation"
                      : "Confirmation"}
                  :{" "}
                  {e.status === "sent"
                    ? "sent"
                    : e.status === "sending"
                      ? "sending"
                      : "not confirmed"}
                  {e.canRetry &&
                    (e.kind !== "offer" || (o.is_current && !o.response)) && (
                      <button
                        type="button"
                        className="plain-button"
                        disabled={busy || disabled || !!mode}
                        onClick={() => retry(e.id)}
                      >
                        Retry email
                      </button>
                    )}
                </p>
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
