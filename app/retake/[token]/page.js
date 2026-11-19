import { Header, Footer } from "../../components/Shell";
import { db } from "../../../lib/db";
import { publicRetake } from "../../../lib/photo-retakes";
import { BUSINESS } from "../../../lib/site";
import RetakeForm from "./RetakeForm";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Retake your photos",
  robots: { index: false, follow: false, nosnippet: true },
  referrer: "no-referrer",
  alternates: { canonical: null },
  openGraph: {
    title: "Private SellMySlabs photo request",
    description: "Add new photos using the private link in your email.",
  },
};
export default async function Page({ params }) {
  const { token } = await params;
  let retake = null,
    unavailable = false;
  try {
    retake = await publicRetake(db(), token);
  } catch {
    unavailable = true;
  }
  return (
    <>
      <Header context="seller" />
      <main id="main" className="wrap purchase-page">
        {retake ? (
          <RetakeForm token={token} retake={retake} />
        ) : (
          <>
            <h1>
              {unavailable
                ? "We couldn’t load this page."
                : "This photo link isn’t available."}
            </h1>
            <p>
              {unavailable
                ? "Please try opening the link again. Your request has not been changed."
                : "Open the complete link from our email, or contact the shop for a new one."}
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
