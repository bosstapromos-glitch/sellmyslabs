import { responseLabel } from "../../lib/consignment-response";
import { consignmentMoney } from "../../lib/consignment-offer";
import { journeyTime } from "../../lib/shipping";
import styles from "./ConsignmentOffer.module.css";
export default function ConsignmentResponseDetails({ response, name, at }) {
  if (!response) return null;
  return (
    <section
      className={`notice ${styles.responseRecord}`}
      aria-label="Seller response"
    >
      <h3>{responseLabel(response.action)}</h3>
      <p>
        {name} · {journeyTime(at)} MT
      </p>
      {response.lines && (
        <>
          <dl className={styles.breakdown}>
            {response.lines.map((line) => (
              <div key={line.itemIndex}>
                <dt>
                  {line.name} · Qty {line.quantity}
                  <br />
                  Proposed sale price
                </dt>
                <dd>{consignmentMoney(line.saleCents)}</dd>
              </div>
            ))}
          </dl>
          <p>
            <strong>
              Estimated seller payout:{" "}
              {consignmentMoney(response.sellerPayoutCents)}
            </strong>
          </p>
          <p className="hint">
            This estimate uses the fees from the original offer. The shop will
            confirm fees in any revised offer.
          </p>
        </>
      )}
      {response.note && <p className="preserve-lines">{response.note}</p>}
    </section>
  );
}
