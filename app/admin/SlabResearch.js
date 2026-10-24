import { altResearchUrl, isGradedSlab } from "../../lib/alt-research";

export default function SlabResearch({ cards }) {
  const slabs = cards.filter(isGradedSlab);
  if (!slabs.length) return null;
  return <section className="owner-photo-review" aria-labelledby="slab-research-heading">
    <h3 id="slab-research-heading">Slab market research</h3>
    <p className="hint">Private · Open the matching card in Alt and select the exact grading company and grade before using its value. Check recent sales as well.</p>
    {slabs.map((item, index) => {
      const url = altResearchUrl(item);
      return <div className="review-row" key={index}>
        <div><strong>{item.name}</strong><br /><span>{item.grader} {item.grade}{item.cert ? ` · Cert ${item.cert}` : ""}</span></div>
        {url ? <a className="button secondary small" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Look up ${item.name} in Alt`}>Look up in Alt ↗</a> : <span className="hint">Manual review · Alt coverage is not confirmed for this slab.</span>}
      </div>;
    })}
    <p className="hint">Opens Alt in your browser; Alt may ask you to sign in. Automatic values are not connected. Research stays private until you enter and send an offer.</p>
  </section>;
}
