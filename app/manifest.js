export default function manifest() {
  return {
    id: "/",
    name: "SellMySlabs",
    short_name: "SellMySlabs",
    description: "Sell cards and sealed products. Review requests in your private workspace.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }],
    shortcuts: [
      { name: "Request an offer", url: "/sell" },
      { name: "Owner workspace", url: "/admin" },
    ],
  };
}
