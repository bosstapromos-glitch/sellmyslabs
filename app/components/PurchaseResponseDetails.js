import { purchaseResponseLabel } from "../../lib/purchase-response";
import { money } from "../../lib/purchase-terms";
import { journeyTime } from "../../lib/shipping";
import styles from "./ConsignmentOffer.module.css";
export default function PurchaseResponseDetails({ response, name, at }) {
  if (!response) return null;
  return (
    <section
      className={`notice ${styles.responseRecord}`}
      aria-label="Seller response"
    >
      <h3>{purchaseResponseLabel(response.action)}</h3>
      <p>
        {name} · {journeyTime(at)} MT
      </p>
      {response.action === "counter" && (
        <p>
          Proposed total for the listed collection:{" "}
          <strong>{money(response.amount)}</strong>
        </p>
      )}
      {response.note && <p className="preserve-lines">{response.note}</p>}
    </section>
  );
}
