import { CONSIGNMENT_RATES } from "../../lib/consignment";
import styles from "./Consignment.module.css";
export default function ConsignmentRates() {
  return (
    <div className={styles.rates}>
      <table>
        <caption>Seller payout tiers</caption>
        <thead>
          <tr>
            <th scope="col">Item sale price</th>
            <th scope="col">Payout rate</th>
          </tr>
        </thead>
        <tbody>
          {CONSIGNMENT_RATES.map((tier) => (
            <tr key={tier.min}>
              <td>{tier.label}</td>
              <td>{tier.percent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.note}>
        The item sale price determines the tier. We deduct actual
        marketplace/payment fees and the listing fee first, then apply your
        payout percentage to the remainder.
      </p>
      <p className={styles.note}>
        Listing fees: $0.99 per single, $2.99 per lot, and $9.99 per
        sealed-product listing.
      </p>
      <p className={styles.note}>
        <strong>Example:</strong> A $100 item sale with $15 in
        marketplace/payment fees and a $0.99 listing fee leaves $84.01. Your 87%
        payout is <strong>$73.09</strong>. Actual fees vary by sale and channel.
      </p>
    </div>
  );
}
