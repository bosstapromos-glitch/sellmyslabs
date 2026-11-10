import { consignmentMoney } from "../../lib/consignment-offer";
import styles from "./ConsignmentOffer.module.css";
export default function ConsignmentOfferDetails({ snapshot: s }) {
  return (
    <div className={styles.details}>
      {s.kind === "sale" && (
        <>
          <div className="purchase-total">
            <span>Estimated seller payout</span>
            <strong>{consignmentMoney(s.sellerPayoutCents)}</strong>
          </div>
          <p>
            {s.channel} · Total buyer offer {consignmentMoney(s.saleCents)}
          </p>
          <p className="hint">
            Final payout uses actual marketplace/payment fees. The accepted sale
            prices and payout rates stay on this record.
          </p>
        </>
      )}
      <h2>
        {s.kind === "sale" ? "Items in this buyer offer" : "Items to consign"}
      </h2>
      <ul className={styles.items}>
        {s.items.map((item, index) => (
          <li key={index}>
            <h3>{item.name}</h3>
            <p>
              {item.details} · Qty {item.quantity}
              {item.cert && ` · Cert ${item.cert}`}
            </p>
            {s.kind === "arrangement" && item.asking && (
              <p>Target price: ${Number(item.asking).toFixed(2)} each</p>
            )}
            {s.kind === "sale" && (
              <dl className={styles.breakdown}>
                <div>
                  <dt>Buyer’s price for this listing</dt>
                  <dd>{consignmentMoney(item.saleCents)}</dd>
                </div>
                <div>
                  <dt>Estimated marketplace/payment fees</dt>
                  <dd>−{consignmentMoney(item.feeCents)}</dd>
                </div>
                <div>
                  <dt>Listing fee · {item.listingType}</dt>
                  <dd>−{consignmentMoney(item.listingFeeCents)}</dd>
                </div>
                <div>
                  <dt>Seller payout rate after fees</dt>
                  <dd>{item.percent}%</dd>
                </div>
                <div>
                  <dt>Estimated seller payout</dt>
                  <dd>
                    <strong>{consignmentMoney(item.sellerPayoutCents)}</strong>
                  </dd>
                </div>
              </dl>
            )}
          </li>
        ))}
      </ul>
      {s.message && (
        <section>
          <h2>A note from the shop</h2>
          <p className="preserve-lines">{s.message}</p>
        </section>
      )}
      <section className="purchase-terms">
        <h2>{s.terms.title}</h2>
        <p className="hint">Version {s.terms.version}</p>
        {s.kind === "arrangement" && (
          <table className={styles.rates}>
            <caption>Seller payout after fees</caption>
            <thead>
              <tr>
                <th>Sale price per listing</th>
                <th>Payout rate</th>
              </tr>
            </thead>
            <tbody>
              {s.rates.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td>{r.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {s.terms.sections.map((t) => (
          <section key={t.title}>
            <h3>{t.title}</h3>
            <p>{t.text}</p>
          </section>
        ))}
      </section>
    </div>
  );
}
