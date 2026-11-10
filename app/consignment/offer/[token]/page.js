import { Header, Footer } from "../../../components/Shell";
import { db } from "../../../../lib/db";
import { consignmentId } from "../../../../lib/consignment-token";
import {
  CONSIGNMENT_OFFER_SQL,
  publicConsignmentOffer,
} from "../../../../lib/consignment-records";
import ConsignmentReview from "./ConsignmentReview";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Review your consignment",
  robots: { index: false, follow: false, nosnippet: true },
  referrer: "no-referrer",
  alternates: { canonical: null },
  openGraph: {
    title: "Private SellMySlabs consignment",
    description: "Review your private consignment arrangement or buyer offer.",
  },
};
export default async function Page({ params }) {
  let offer = null,
    failed = false;
  const { token } = await params;
  try {
    const id = consignmentId(token);
    if (id) {
      const [row] = await db().query(CONSIGNMENT_OFFER_SQL, [id]);
      offer = publicConsignmentOffer(row);
    }
  } catch {
    failed = true;
  }
  return (
    <>
      <Header context="seller" />
      <main id="main" className="wrap purchase-page">
        {offer ? (
          <ConsignmentReview token={token} initialOffer={offer} />
        ) : (
          <>
            <h1>
              {failed
                ? "We couldn’t load this approval."
                : "This link isn’t available."}
            </h1>
            <p>
              Open the complete link from your notification or find the latest
              approval in your account.
            </p>
            <a className="button" href="/account">
              Your account
            </a>
          </>
        )}
      </main>
      <Footer compact />
    </>
  );
}
