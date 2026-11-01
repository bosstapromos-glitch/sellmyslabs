import { Header, Footer } from "../../components/Shell";
import { db } from "../../../lib/db";
import { purchaseId } from "../../../lib/purchase-token";
import {
  PURCHASE_OFFER_SQL,
  publicPurchaseOffer,
} from "../../../lib/purchase-records";
import { BUSINESS } from "../../../lib/site";
import OfferReview from "./OfferReview";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Review your offer",
  robots: { index: false, follow: false, nosnippet: true },
  referrer: "no-referrer",
  alternates: { canonical: null },
  openGraph: {
    title: "Private SellMySlabs offer",
    description: "Review your offer using the private link in your email.",
  },
};
export default async function Page({ params, searchParams }) {
  const { token } = await params;
  const fromAccount = (await searchParams)?.from === "account";
  let offer = null,
    unavailable = false;
  try {
    const id = purchaseId(token);
    if (id) {
      const [row] = await db().query(PURCHASE_OFFER_SQL, [id]);
      offer = publicPurchaseOffer(row);
    }
  } catch {
    unavailable = true;
  }
  return (
    <>
      <Header context="seller" />
      <main id="main" className="wrap purchase-page">
        {fromAccount && (
          <a className="plain-button" href="/account">
            ← Your requests
          </a>
        )}
        {offer ? (
          <OfferReview token={token} initialOffer={offer} />
        ) : (
          <>
            <h1>
              {unavailable
                ? "We couldn’t load your offer."
                : "This offer link isn’t available."}
            </h1>
            <p>
              {unavailable
                ? "Please try opening the link again. Your purchase has not been changed."
                : "Open the complete link from your offer email, or contact the shop for help."}
            </p>
            <a className="button secondary" href={BUSINESS.phoneHref}>
              Call {BUSINESS.phone}
            </a>
          </>
        )}
      </main>
      <Footer compact />
    </>
  );
}
