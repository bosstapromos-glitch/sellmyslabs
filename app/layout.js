import "./globals.css";
export const metadata = {
  metadataBase: new URL("https://www.sellmyslabs.net"),
  title: {
    default: "Sell Pokémon, Sports Cards & Sealed Products | SellMySlabs",
    template: "%s | SellMySlabs",
  },
  description:
    "Sell graded cards, raw Pokémon and sports cards, and sealed products to Lifestyle Cards & Collectibles in Twin Falls, Idaho. Request a personal offer.",
  twitter: { card: "summary_large_image", images: ["/opengraph-image"] },
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Great cards. A simpler sale.",
    description: "Request an offer for graded cards, raw cards and sealed products.",
    url: "https://www.sellmyslabs.net",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "SellMySlabs — Sell your graded cards" }],
    type: "website",
    siteName: "SellMySlabs",
    locale: "en_US",
  },
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
