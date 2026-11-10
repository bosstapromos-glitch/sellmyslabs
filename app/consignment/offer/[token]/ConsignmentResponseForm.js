"use client";
import { useState, useRef, useEffect } from "react";
import { buildConsignmentResponse } from "../../../../lib/consignment-response";
import { consignmentMoney } from "../../../../lib/consignment-offer";
import styles from "../../../components/ConsignmentOffer.module.css";
export default function ConsignmentResponseForm({
  mode,
  snapshot,
  initialName,
  onSubmit,
  onCancel,
  busy,
}) {
  const [name, setName] = useState(initialName || ""),
    [note, setNote] = useState(""),
    [prices, setPrices] = useState(
      (snapshot.lines || []).map((l) => ({
        itemIndex: l.itemIndex,
        salePrice: (l.saleCents / 100).toFixed(2),
      })),
    );
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const title =
    mode === "counter"
      ? "Make a counteroffer"
      : mode === "changes"
        ? "Request changes"
        : `Decline this ${snapshot.kind === "arrangement" ? "arrangement" : "buyer offer"}`;
  let estimate = null;
  if (mode === "counter")
    try {
      estimate = buildConsignmentResponse(snapshot, {
        action: mode,
        note,
        prices,
      });
    } catch {}
  return (
    <form
      className="purchase-acceptance"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          action: mode,
          name,
          note,
          prices: mode === "counter" ? prices : [],
        });
      }}
    >
      <h2 ref={heading} tabIndex={-1}>
        {title}
      </h2>
      <p>
        {mode === "counter"
          ? "Enter your proposed buyer sale price for each listing, before fees. The items and quantities stay the same. The shop will review your counteroffer and send a revised offer for you to accept."
          : mode === "changes"
            ? "Tell the shop what needs changing. They can send a revised arrangement here for your review."
            : snapshot.kind === "sale"
              ? "This declines this buyer offer only. Your consignment arrangement stays in place, and the shop can send a new offer."
              : "The shop will see that you declined this arrangement. It can send a revised arrangement if you decide to continue."}
      </p>
      <fieldset
        className={`form-fields ${styles.responseFields}`}
        disabled={busy}
      >
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
        {mode === "counter" &&
          snapshot.lines.map((line, i) => (
            <label className="field" key={line.itemIndex}>
              Proposed sale price for {line.name} (USD)
              <span className="hint">
                Qty {line.quantity} · Current offer{" "}
                {consignmentMoney(line.saleCents)}
              </span>
              <input
                inputMode="decimal"
                required
                maxLength={20}
                value={prices[i].salePrice}
                onChange={(e) =>
                  setPrices((all) =>
                    all.map((p, j) =>
                      i === j ? { ...p, salePrice: e.target.value } : p,
                    ),
                  )
                }
              />
            </label>
          ))}
        {estimate && (
          <div className="notice" aria-live="polite">
            <strong>
              Estimated seller payout:{" "}
              {consignmentMoney(estimate.sellerPayoutCents)}
            </strong>
            <p className="hint">
              Based on the original offer’s fee estimates. Fees may change with
              the revised sale price; the shop will confirm them before you
              accept.
            </p>
          </div>
        )}
        <label className="field">
          {mode === "changes"
            ? "What would you like to change?"
            : "Note to the shop (optional)"}
          <textarea
            required={mode === "changes"}
            maxLength={2000}
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <div className={styles.controls}>
          <button className="button" disabled={busy || name.trim().length < 2}>
            {busy
              ? "Saving response…"
              : mode === "counter"
                ? "Send counteroffer"
                : mode === "changes"
                  ? "Send change request"
                  : "Confirm decline"}
          </button>
          <button type="button" className="plain-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </fieldset>
    </form>
  );
}
