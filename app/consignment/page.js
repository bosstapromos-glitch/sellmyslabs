import { Header, Footer } from "../components/Shell";
import ConsignmentRates from "../components/ConsignmentRates";
import {
  CONSIGNMENT_PAYMENT,
  CONSIGNMENT_APPROVAL,
} from "../../lib/consignment";
import styles from "../components/Consignment.module.css";
export const metadata = {
  title: "Card & Sealed Product Consignment",
  description:
    "Consign graded cards, raw cards and sealed products with Lifestyle Cards & Collectibles in Twin Falls. In-store and eBay sales, with seller-approved offers.",
  alternates: { canonical: "/consignment" },
  openGraph: {
    title: "Consignment | SellMySlabs",
    description:
      "Explore consignment rates and submit your items for review. Sold in-store and on eBay.",
    url: "/consignment",
  },
};
export default function Page() {
  return (
    <>
      <Header />
      <main id="main" className={`wrap ${styles.page}`}>
        <span className="eyebrow">CONSIGN WITH US</span>
        <h1>Give your items time to find their buyer.</h1>
        <p className={styles.lead}>
          Prefer to aim for a higher sale price instead of taking a direct
          offer? We can sell your graded cards, raw cards and sealed products in
          our store and on eBay.
        </p>
        <p>
          A higher payout isn’t guaranteed. Your return depends on the sale
          price, fees and payout tier, and payment follows the buyer’s payment.
        </p>
        <a className="button" href="/sell?method=consignment">
          Request consignment
        </a>
        <section className={styles.section}>
          <h2>Your price. Your approval.</h2>
          <p>{CONSIGNMENT_APPROVAL}</p>
          <p>
            We review each request and confirm listing, delivery and consignment
            arrangements with you before proceeding. Please wait for
            confirmation before sending items.
          </p>
        </section>
        <section className={styles.section} aria-label="Consignment rates">
          <ConsignmentRates />
        </section>
        <section className={styles.section}>
          <h2>Payment after the sale</h2>
          <p>{CONSIGNMENT_PAYMENT}</p>
        </section>
        <section className={styles.section}>
          <h2>Ready to show us your items?</h2>
          <p>
            Use the same simple form to add your items, target prices and
            photos. Signed-in customers can save a draft and continue on another
            device.
          </p>
          <a className="button" href="/sell?method=consignment">
            Request consignment
          </a>{" "}
          <a className="plain-button" href="/sell">
            Get a direct offer
          </a>
        </section>
      </main>
      <Footer />
    </>
  );
}
