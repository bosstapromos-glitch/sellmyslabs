"use client";
import { useState } from "react";
import ReferencePanel from "../../components/catalog-reference/ReferencePanel";
import { referenceIdentity, referenceSource } from "../../lib/catalog-identity";
export default function SlabResearch({ cards }) {
  const [active, setActive] = useState(0);
  if (!cards.length) return null;
  const index = Math.min(active, cards.length - 1), item = cards[index];
  return <section className="owner-photo-review" aria-labelledby="slab-research-heading">
    <h3 id="slab-research-heading">Card value</h3>
    {cards.length > 1 && <label>Research item<select value={index} onChange={event => {setActive(Number(event.target.value))}}>{cards.map((card, i) => <option key={i} value={i}>{i + 1}. {card.name} · {card.grader} {card.grade}</option>)}</select></label>}
    <ReferencePanel key={index + ":" + JSON.stringify(item)} endpoint="/api/admin/catalog" identity={referenceIdentity(item)} source={referenceSource(item)} />
  </section>;
}
