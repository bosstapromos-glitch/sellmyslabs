import { Header, Footer } from "../components/Shell";
import SellForm from "./SellForm";
export const metadata = {
  title: "Sell Cards & Sealed Products",
  description:
    "Send graded cards, raw cards or sealed products with photos and an optional asking price. Choose a direct offer or consignment with Lifestyle Cards & Collectibles.",
  alternates: {
    canonical: "/sell",
  },
  openGraph: {
    title: "Sell Cards & Sealed Products | SellMySlabs",
    description:
      "Send graded cards, raw cards or sealed products with photos and an optional asking price. Choose a direct offer or consignment with Lifestyle Cards & Collectibles.",
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
        <SellForm />
      </main>
      <Footer compact />
    </>
  );
}
