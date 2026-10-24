import { ImageResponse } from "next/og";
export const alt = "SellMySlabs — Sell cards and sealed products to Lifestyle Cards & Collectibles";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", background: "#f3f8ff", padding: 76, display: "flex", flexDirection: "column", justifyContent: "space-between", fontFamily: "sans-serif", color: "#102b4f", borderBottom: "16px solid #1768df" }}>
    <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: "#1768df" }}>SellMySlabs</div>
    <div style={{ display: "flex", flexDirection: "column", fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}><span>Great cards.</span><span>A simpler sale.</span></div>
    <div style={{ display: "flex", fontSize: 30 }}>Graded cards · Raw cards · Sealed products</div>
    <div style={{ display: "flex", fontSize: 24 }}>Lifestyle Cards & Collectibles · Twin Falls, Idaho</div>
  </div>, size);
}
