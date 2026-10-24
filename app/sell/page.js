import { Header, Footer } from "../components/Shell";
import SellForm from "./SellForm";
export const metadata = {
  "title": "Sell Cards & Sealed Products",
  "description": "Send graded cards, raw cards or sealed products with photos and an optional asking price. Get a personal offer from Lifestyle Cards & Collectibles.",
  "alternates": {
    "canonical": "/sell"
  },
  "openGraph": {
    "title": "Sell Cards & Sealed Products | SellMySlabs",
    "description": "Send graded cards, raw cards or sealed products with photos and an optional asking price. Get a personal offer from Lifestyle Cards & Collectibles.",
    "url": "/sell",
    "type": "website",
    "siteName": "SellMySlabs",
    "images": [{ "url": "/opengraph-image", "width": 1200, "height": 630, "alt": "SellMySlabs — Sell your graded cards" }]
  }
};
export default function Page() {
  return (
    <>
      <Header />
      <main id="main" className="wrap form-page">
        <span className="eyebrow">YOUR COLLECTION. YOUR NEXT CHAPTER.</span>
        <h1>What would you like to sell?</h1>
        <p>Graded cards, raw cards and sealed products. A real person will review your request. No obligation.</p>
        <SellForm />
      </main>
      <Footer />
    </>
  );
}
