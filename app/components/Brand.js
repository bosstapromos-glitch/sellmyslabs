export function Mark({ size = 38 }) {
  return (
    <svg
      width={size}
      height={size * 1.18}
      viewBox="0 0 44 52"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="40" height="48" rx="9" fill="currentColor" />
      <rect
        x="7"
        y="7"
        width="30"
        height="38"
        rx="4"
        stroke="white"
        strokeWidth="2.4"
      />
      <path d="M12 12h20v5H12z" fill="white" />
      <path
        d="M31 22c-11-4-18 1-14 6 2 3 14 3 14 9 0 5-8 7-17 3v-6c7 4 12 4 12 1 0-2-13-3-13-10 0-7 11-10 18-7z"
        fill="white"
      />
    </svg>
  );
}
export default function Brand() {
  return (
    <a className="brand" href="/" aria-label="SellMySlabs home">
      <Mark />
      <span>SellMySlabs</span>
    </a>
  );
}
