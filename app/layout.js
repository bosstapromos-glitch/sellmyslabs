import "./globals.css";
export const metadata = {
  metadataBase: new URL("https://www.sellmyslabs.net"),
  title: {
    default: "SellMySlabs | A simpler way to sell graded cards",
    template: "%s | SellMySlabs",
  },
  description:
    "Sell PSA, CGC, BGS and TAG graded cards to Lifestyle Cards & Collectibles. Request a personal offer for one slab or your collection.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Great cards. A simpler sale.",
    description: "Request an offer for your PSA, CGC, BGS or TAG slabs.",
    url: "https://www.sellmyslabs.net",
    type: "website",
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
