import { money } from "../../lib/purchase-terms";
import { purchaseResponseLabel } from "../../lib/purchase-response";
import { journeyTime } from "../../lib/shipping";
import { BUSINESS } from "../../lib/site";
import PurchaseResponseDetails from "../components/PurchaseResponseDetails";
import styles from "./Account.module.css";
export default function PurchaseOfferSummary({
  offer,
  records = [],
  closed = false,
}) {
  const previous = records.filter((r) => r.id !== offer?.id);
  return (
    <>
      {offer && (
        <section className={styles.offer} aria-label="Your offer">
          <div>
            <h2>
              {offer.response
                ? "Original offer"
                : offer.acceptedAt
                  ? "Agreed price"
                  : "Our offer"}
            </h2>
            <strong className={styles.amount}>{money(offer.amount)}</strong>
            <p className={styles.muted}>Total for the listed collection</p>
          </div>
          <div>
            {offer.url ? (
              <a className="button" href={`${offer.url}?from=account`}>
                {offer.response
                  ? "View response record"
                  : offer.acceptedAt
                    ? "View accepted offer"
                    : closed
                      ? "View offer"
                      : "Review offer"}
              </a>
            ) : (
              <p>
                This earlier offer is in your email.{" "}
                <a className="text-link" href={BUSINESS.phoneHref}>
                  Contact the shop
                </a>{" "}
                for an updated acceptance link.
              </p>
            )}
          </div>
        </section>
      )}
      {offer?.response && (
        <PurchaseResponseDetails
          response={offer.response}
          name={offer.responseName}
          at={offer.respondedAt}
        />
      )}
      {previous.length > 0 && (
        <section
          className={styles.section}
          aria-label="Earlier offer decisions"
        >
          <h2>Earlier decisions</h2>
          <ul className={styles.items}>
            {previous.map((r) => (
              <li key={r.id}>
                <h3>
                  {r.response
                    ? purchaseResponseLabel(r.response.action)
                    : "Offer accepted"}
                </h3>
                <p>
                  {money(r.amount)} original offer ·{" "}
                  {journeyTime(r.respondedAt || r.acceptedAt)} MT
                </p>
                {r.response?.action === "counter" && (
                  <p>
                    Proposed collection total:{" "}
                    <strong>{money(r.response.amount)}</strong>
                  </p>
                )}
                <a className="text-link" href={r.url}>
                  View {r.response ? "response" : "acceptance"} record
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
