"use client";
import { useState, useRef, useEffect } from "react";
import { money } from "../../../lib/purchase-terms";
import styles from "../../components/ConsignmentOffer.module.css";
export default function PurchaseResponseForm({
  mode,
  snapshot,
  initialName,
  busy,
  onSubmit,
  onCancel,
}) {
  const [name, setName] = useState(initialName || ""),
    [amount, setAmount] = useState(snapshot.amount),
    [note, setNote] = useState("");
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <form
      className="purchase-acceptance"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          action: mode,
          name,
          amount: mode === "counter" ? amount : "",
          note,
        });
      }}
    >
      <h2 ref={heading} tabIndex={-1}>
        {mode === "counter" ? "Make a counteroffer" : "Decline this offer"}
      </h2>
      <p>
        {mode === "counter"
          ? "Enter one total price for the same listed collection. The shop will review it and send a revised offer for you to accept."
          : "This declines this version of the offer. You can leave a note, and the shop can send a new offer if you decide to continue."}
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
        {mode === "counter" && (
          <label className="field">
            Your proposed total (USD)
            <span className="hint">
              Current offer: {money(snapshot.amount)} for the listed collection
            </span>
            <input
              inputMode="decimal"
              required
              maxLength={20}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
        )}
        <label className="field">
          Note to the shop (optional)
          <textarea
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
                : "Confirm decline"}
          </button>
          <button type="button" className="plain-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </fieldset>
      <p className="hint">
        Do not ship until you accept an offer and confirm shipping details with
        the shop.
      </p>
    </form>
  );
}
