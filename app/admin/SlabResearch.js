"use client";
import { useState } from "react";
import ReferencePanel from "../../components/catalog-reference/ReferencePanel";
import { referenceIdentity, referenceSource } from "../../lib/catalog-identity";
export default function SlabResearch({ cards }) {
  const [active, setActive] = useState(0), [chosenSource, setChosenSource] = useState('');
  if (!cards.length) return null;
  const index = Math.min(active, cards.length - 1), item = cards[index];
  return <section className="owner-photo-review" aria-labelledby="slab-research-heading">
    <h3 id="slab-research-heading">Private pricing research</h3>
    <p className="hint">ALT for graded slabs. TCGplayer for ungraded and sealed prices. Collectr for additional catalog references.</p>
    {cards.length > 1 && <label>Research item<select value={index} onChange={event => {setActive(Number(event.target.value));setChosenSource('')}}>{cards.map((card, i) => <option key={i} value={i}>{i + 1}. {card.name} · {card.grader} {card.grade}</option>)}</select></label>}
    <label>Reference source<select value={chosenSource || referenceSource(item)} onChange={event => setChosenSource(event.target.value)}><option value="ALT">ALT · Graded valuations</option><option value="TCGplayer">TCGplayer · Ungraded and sealed</option><option value="Collectr">Collectr · Catalog reference</option></select></label>
    <ReferencePanel key={index + ":" + JSON.stringify(item)} endpoint="/api/admin/catalog" identity={referenceIdentity(item)} source={chosenSource || referenceSource(item)} />
    <p className="hint">Visible only in your owner workspace. Research does not change the customer’s asking price or send an offer.</p>
  </section>;
}
