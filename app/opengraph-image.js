import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Mark } from "./components/Brand";

export const alt = "SellMySlabs — We buy graded cards, raw cards and sealed products";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const photo = await readFile(join(process.cwd(), "public/images/tag-charizard.jpg"));
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#ffffff", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", width: 750, padding: "64px 48px 54px 58px", color: "#102b4f", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, color: "#2167d5" }}>
          <Mark size={66} />
          <span style={{ fontSize: 66, fontWeight: 700, letterSpacing: -3 }}>SellMySlabs</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 88, lineHeight: 1.05, fontWeight: 700, letterSpacing: -4 }}>
          <span>Sell your</span>
          <span style={{ color: "#2167d5" }}>collection.</span>
        </div>
        <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: "#52637a" }}>Graded · Raw · Sealed</div>
      </div>
      <div style={{ display: "flex", width: 450, height: 630, background: "#0b111a", alignItems: "center", justifyContent: "center", borderLeft: "12px solid #2167d5" }}>
        <img src={`data:image/jpeg;base64,${photo.toString("base64")}`} width={350} height={622} style={{ objectFit: "contain" }} />
      </div>
    </div>,
    size,
  );
}
