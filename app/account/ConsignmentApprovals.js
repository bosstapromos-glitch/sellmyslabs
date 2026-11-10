import { journeyTime } from "../../lib/shipping";
import styles from "./Account.module.css";
const money = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
export default function ConsignmentApprovals({
  approvals = [],
  closed = false,
}) {
  return (
    <>
      {!!approvals?.length && (
        <section
          className={styles.section}
          aria-labelledby="consignment-approvals"
        >
          <h2 id="consignment-approvals">Consignment approvals</h2>
          <ul className={styles.items}>
            {approvals.map((a) => (
              <li key={a.id}>
                <h3>
                  {a.kind === "arrangement"
                    ? "Consignment arrangement"
                    : "Buyer offer"}
                </h3>
                {a.payout != null && (
                  <p>
                    Estimated seller payout:{" "}
                    <strong>{money(a.payout / 100)}</strong>
                  </p>
                )}
                <p>
                  {a.acceptedAt
                    ? `Accepted ${journeyTime(a.acceptedAt)} MT${a.isCurrent ? "" : " · Earlier record"}`
                    : closed
                      ? "Request closed"
                      : "Ready for your review"}
                </p>
                <a
                  className={a.acceptedAt ? "text-link" : "button"}
                  href={a.url}
                >
                  {a.acceptedAt
                    ? "View acceptance record"
                    : closed
                      ? "View record"
                      : a.kind === "arrangement"
                        ? "Review arrangement"
                        : "Review buyer offer"}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
