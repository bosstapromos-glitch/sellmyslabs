import { journeyTime } from "../../lib/shipping";
import styles from "./ShippingProgress.module.css";

export default function ShippingProgress({ shipment }) {
  const steps = [
    ["Offer accepted", shipment.acceptedAt],
    ["Shipped", shipment.shippedAt, "Confirmed by seller"],
    ["Received · in inspection", shipment.receivedAt, "Confirmed by shop"],
    ["Inspection complete", shipment.inspectedAt, "Confirmed by shop"],
    ["Payment sent", shipment.paidAt, "Confirmed by shop"],
  ];
  const latest = steps.reduce((last, step, i) => (step[1] ? i : last), 0);
  return (
    <>
      <ol className={styles.timeline} aria-label="Purchase progress">
        {steps.map(([label, at, source], i) => (
          <li
            key={label}
            className={at ? styles.complete : ""}
            aria-current={i === latest ? "step" : undefined}
          >
            <span className={styles.dot} aria-hidden="true">
              {at ? "✓" : i + 1}
            </span>
            <div>
              <strong>{label}</strong>
              {at ? (
                <>
                  <time dateTime={at}>{journeyTime(at)} MT</time>
                  {source && <span>{source}</span>}
                </>
              ) : (
                <span>
                  {i === 1 && shipment.receivedAt
                    ? "No tracking shared"
                    : "Not yet confirmed"}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
      {shipment.trackingUrl && (
        <div className={styles.tracking}>
          <div>
            <strong>{shipment.carrier}</strong>
            <span>{shipment.tracking}</span>
          </div>
          <a
            className="text-link"
            href={shipment.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Track package ↗
          </a>
        </div>
      )}
      {shipment.receivedAt && !shipment.inspectedAt && !shipment.closed && (
        <p className="hint">
          Inspection is due within 72 hours of delivery:{" "}
          {journeyTime(
            new Date(new Date(shipment.receivedAt).getTime() + 72 * 3600000),
          )}{" "}
          MT.
        </p>
      )}
      {shipment.inspectedAt && !shipment.paidAt && !shipment.closed && (
        <p className="hint">
          Payment is initiated the same day inspection confirms the items match.
        </p>
      )}
      {shipment.paidAt && (
        <p className="hint">
          The shop has marked payment as sent. Your payment provider may take
          additional time to make funds available.
        </p>
      )}
      {shipment.closed && (
        <p className="hint">
          This request is closed. Contact the shop if you need help.
        </p>
      )}
    </>
  );
}
