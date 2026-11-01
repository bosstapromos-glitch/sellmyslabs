"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { requestJSON } from "../../../lib/request-json";
import { CARRIERS, trackingSchema } from "../../../lib/shipping";
import useUnsavedChanges from "../../components/useUnsavedChanges";
import ShippingProgress from "../../components/ShippingProgress";
import styles from "../../components/ShippingProgress.module.css";

export default function ShippingPanel({ token }) {
  const [shipment, setShipment] = useState(null);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const message = useRef(null);
  const dirty =
    !!shipment &&
    (carrier !== shipment.carrier || tracking !== shipment.tracking);
  useUnsavedChanges(dirty || busy);
  const endpoint = `/api/offers/${token}/shipping`;
  const apply = useCallback((value) => {
    setShipment(value);
    setCarrier(value.carrier);
    setTracking(value.tracking);
  }, []);
  const refresh = useCallback(async () => {
    setLoading(true);
    setConfirmRefresh(false);
    setError("");
    setFormError(false);
    try {
      const data = await requestJSON(endpoint);
      apply(data.shipment);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, apply]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (error) message.current?.focus();
  }, [error]);
  async function save(event) {
    event.preventDefault();
    if (busy || loading) return;
    setConfirmRefresh(false);
    setFormError(true);
    const parsed = trackingSchema.safeParse({
      carrier,
      tracking,
      version: shipment.version,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const data = await requestJSON(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      apply(data.shipment);
      setSaved(true);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  const errorMessage = error && (
    <p ref={message} tabIndex={-1} className="error" role="alert">
      {error}
    </p>
  );
  const trackingForm = shipment?.canEdit && (
    <form className={styles.form} onSubmit={save}>
      {!shipment.shippedAt && (
        <p className="hint">
          Confirm the shipping address with the shop before sending your items.
        </p>
      )}
      <fieldset className="form-fields" disabled={busy || loading}>
        <div className={styles.fields}>
          <label htmlFor="shipping-carrier">
            Carrier
            <select
              id="shipping-carrier"
              required
              value={carrier}
              onChange={(event) => {
                setCarrier(event.target.value);
                setSaved(false);
              }}
            >
              <option value="" disabled>
                Select…
              </option>
              {CARRIERS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label htmlFor="shipping-tracking">
            Tracking number
            <input
              id="shipping-tracking"
              required
              minLength={8}
              maxLength={80}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              value={tracking}
              onChange={(event) => {
                setTracking(event.target.value);
                setSaved(false);
              }}
            />
          </label>
        </div>
        <p className="hint">
          Confirm shipment after you’ve handed the package to the carrier. You
          pay shipping and insurance; keep your receipt.
        </p>
        <button
          className="button"
          disabled={busy || loading || (!dirty && !!shipment.shippedAt)}
        >
          {busy
            ? "Saving tracking…"
            : shipment.shippedAt
              ? "Update tracking"
              : "Confirm shipment"}
        </button>
      </fieldset>
      {formError && errorMessage}
    </form>
  );
  return (
    <section className={styles.panel} aria-labelledby="shipping-heading">
      <div className={styles.heading}>
        <h2 id="shipping-heading">Shipping & progress</h2>
        <button
          type="button"
          className="plain-button"
          disabled={busy || loading}
          onClick={() => {
            if (dirty) setConfirmRefresh(true);
            else refresh();
          }}
        >
          {loading ? "Loading…" : "Refresh progress"}
        </button>
      </div>
      {confirmRefresh && (
        <div className={styles.refreshConfirm}>
          <p>Refreshing will discard your unsaved tracking changes.</p>
          <div className={styles.refreshActions}>
            <button
              type="button"
              className="plain-button"
              onClick={() => setConfirmRefresh(false)}
            >
              Keep editing
            </button>
            <button type="button" className="plain-button" onClick={refresh}>
              Discard edits and refresh
            </button>
          </div>
        </div>
      )}
      <p className="hint">
        Updates here are confirmed by you and the shop. Use Track package for
        the carrier’s latest scans.
      </p>
      {!formError && errorMessage}
      {shipment?.canEdit && !shipment.shippedAt && trackingForm}
      {shipment && <ShippingProgress shipment={shipment} />}
      {shipment?.canEdit && shipment.shippedAt && (
        <details className={styles.editTracking}>
          <summary>Edit tracking</summary>
          {trackingForm}
        </details>
      )}
      {saved && (
        <p className="success" role="status">
          Tracking saved. The shop can now follow your package.
        </p>
      )}
    </section>
  );
}
