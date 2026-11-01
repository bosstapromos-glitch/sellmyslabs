"use client";
import { useEffect, useState } from "react";
import ShippingProgress from "../components/ShippingProgress";
import { requestJSON } from "../../lib/request-json";
import styles from "../components/ShippingProgress.module.css";

function localNow() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export default function ShipmentProgress({
  offerId,
  editVersion,
  disabled,
  onSaved,
  onBusyChange,
  onReload,
}) {
  const [shipment, setShipment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [at, setAt] = useState(localNow);
  const [saved, setSaved] = useState(false);
  async function load() {
    setBusy(true);
    setError("");
    try {
      const data = await requestJSON(`/api/admin/shipping?id=${offerId}`);
      setShipment(data.shipment);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, [offerId]);
  const next = !shipment?.receivedAt
    ? "received"
    : !shipment.inspectedAt
      ? "inspected"
      : "paid";
  const labels = {
    received: "Mark received",
    inspected: "Complete inspection",
    paid: "Mark payment sent",
  };
  async function update(event) {
    event.preventDefault();
    if (busy || disabled || !shipment) return;
    const date = new Date(at);
    if (!Number.isFinite(date.getTime())) {
      setError("Enter the time this happened.");
      return;
    }
    setBusy(true);
    onBusyChange(true);
    setError("");
    setSaved(false);
    try {
      const data = await requestJSON("/api/admin/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: offerId,
          action: next,
          version: shipment.version,
          editVersion,
          at: date.toISOString(),
        }),
      });
      setShipment(data.shipment);
      setSaved(true);
      setAt(localNow());
      onSaved(data);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <section
      className={styles.panel}
      aria-label="Shipping and customer progress"
    >
      <div className={styles.heading}>
        <h3>Shipping & customer progress</h3>
        <button
          type="button"
          className="plain-button"
          disabled={busy || disabled}
          onClick={load}
        >
          {busy ? "Updating…" : "Refresh progress"}
        </button>
      </div>
      {shipment && <ShippingProgress shipment={shipment} />}
      {shipment?.canProgress && (
        <form className={styles.form} onSubmit={update}>
          <label htmlFor="progress-time">
            {next === "received"
              ? "Delivered at"
              : next === "inspected"
                ? "Inspection completed at"
                : "Payment sent at"}
            <input
              id="progress-time"
              type="datetime-local"
              required
              value={at}
              disabled={busy || disabled}
              onChange={(event) => setAt(event.target.value)}
            />
          </label>
          <p className="hint">
            {next === "received"
              ? "Use the actual delivery time. This starts the 72-hour inspection window."
              : next === "inspected"
                ? "Confirm only when the items match the current accepted offer."
                : "Mark this only after you have sent payment. This button does not transfer money."}{" "}
            The seller will see this update.
          </p>
          <button className="button secondary" disabled={busy || disabled}>
            {labels[next]}
          </button>
        </form>
      )}
      {disabled && (
        <p className="hint">
          Save or discard your offer edits before updating progress.
        </p>
      )}
      {saved && (
        <p className="success" role="status">
          Customer progress updated.
        </p>
      )}
      {error && (
        <div className="error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="plain-button"
            disabled={busy || disabled}
            onClick={onReload}
          >
            Reload request
          </button>
        </div>
      )}
    </section>
  );
}
