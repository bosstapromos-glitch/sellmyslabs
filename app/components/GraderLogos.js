// Grading company marks, used with permission. Sizes are display sizes in
// pixels; the wordmarks share a height and the Beckett crest is taller.
const LOGOS = [
  { name: "PSA", src: "/images/graders/psa.svg", width: 75, height: 28 },
  { name: "CGC", src: "/images/graders/cgc.svg", width: 69, height: 32 },
  {
    name: "BGS (Beckett Grading)",
    src: "/images/graders/bgs.png",
    width: 48,
    height: 48,
  },
  { name: "TAG", src: "/images/graders/tag.png", width: 81, height: 30 },
];
export default function GraderLogos() {
  return (
    <ul className="grader-logos">
      {LOGOS.map((logo) => (
        <li key={logo.name}>
          {/* Small static marks; next/image adds nothing here and blocks SVG by default. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo.src}
            alt={logo.name}
            width={logo.width}
            height={logo.height}
            decoding="async"
          />
        </li>
      ))}
    </ul>
  );
}
