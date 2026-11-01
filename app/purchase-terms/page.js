import { Header, Footer } from "../components/Shell";
import PurchaseTerms from "../components/PurchaseTerms";
import { PURCHASE_TERMS } from "../../lib/purchase-terms";
import { BUSINESS } from "../../lib/site";
export const metadata = {
  title: "Sell to Us · Purchase Terms",
  description:
    "Our purchase terms for graded cards, raw cards and sealed products, including shipping, inspection, payment and returns.",
  alternates: { canonical: "/purchase-terms" },
};
export default function Page() {
  return (
    <>
      <Header />
      <main id="main" className="wrap prose">
        <span className="eyebrow">SELL TO US</span>
        <h1>Know what happens next.</h1>
        <p>
          SellMySlabs is operated by {BUSINESS.name}. Review these terms before
          agreeing to sell your cards or products. Your offer link lists the
          items and collection total for your specific purchase.
        </p>
        <PurchaseTerms terms={PURCHASE_TERMS} />
        <p>
          Questions before you agree?{" "}
          <a className="text-link" href={BUSINESS.phoneHref}>
            Call {BUSINESS.phone}
          </a>{" "}
          or{" "}
          <a className="text-link" href={`mailto:${BUSINESS.email}`}>
            email the shop
          </a>
          .
        </p>
      </main>
      <Footer />
    </>
  );
}
