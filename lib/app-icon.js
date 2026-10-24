import { ImageResponse } from "next/og";

export function appIcon(size) {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0071e3" }}>
      <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 64 64">
        <rect x="17" y="9" width="30" height="46" rx="5" fill="none" stroke="white" strokeWidth="2.5" />
        <path d="M24 19h16M38 29c-2-5-13-3-12 2 1 4 13 3 12 9-1 5-11 6-14 1" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>,
    { width: size, height: size },
  );
}
