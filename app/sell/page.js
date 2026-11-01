import { Header, Footer } from "../components/Shell";
import SellForm from "./SellForm";
import { catalogStaging } from '../../lib/catalog-staging';
export const metadata = {
  title: "Sell Cards & Sealed Products",
  description:
    "Send graded cards, raw cards or sealed products with photos and an optional asking price. Get a personal offer from Lifestyle Cards & Collectibles.",
  alternates: {
    canonical: "/sell",
  },
  openGraph: {
    title: "Sell Cards & Sealed Products | SellMySlabs",
    description:
      "Send graded cards, raw cards or sealed products with photos and an optional asking price. Get a personal offer from Lifestyle Cards & Collectibles.",
    url: "/sell",
    type: "website",
    siteName: "SellMySlabs",
    images: [
      {
        url: "/opengraph-image?v=2",
        width: 1200,
        height: 630,
        alt: "SellMySlabs — Graded cards, raw cards and sealed products",
      },
    ],
  },
};
export default function Page() {
  return (
    <>
      <Header context="sell" />
      <main id="main" className="wrap form-page">
        {catalogStaging() && <p className="hint">Test preview · Use an @example.test email. These requests go to a separate test inbox.</p>}
        <SellForm />
      </main>
      <Footer compact />
    </>
  );
}
