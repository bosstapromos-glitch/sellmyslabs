'use client';
import { useEffect, useId, useRef, useState } from 'react';
import './reference.css';
import CombinedValue from './CombinedValue';

const money = value => value == null || value === '' || !Number.isFinite(Number(value)) ? 'Unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value));
const saleDate = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString(undefined, {timeZone:'UTC'}) : 'Not supplied';
const safeLink = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; } };
const saleLabels = {
  listing_price: 'Listing price · accepted amount unavailable',
  best_offer_amount_unverified: 'Best offer · accepted amount unverified',
  subject_to_change: 'Provisional amount',
  source_labeled_amount_review_required: 'Source label · review amount',
  source_reported_transaction_amount: 'Reported transaction amount',
};

export default function ReferencePanel({ endpoint, identity, source = 'ALT', autoLoad = true, accountId = '' }) {
  const prefix = useId(), serial = useRef(0), controller = useRef(null), polls = useRef(0);
  const [query, setQuery] = useState(identity.title || ''), [result, setResult] = useState(null), [snapshot, setSnapshot] = useState(null);
  const [sourceUrl, setSourceUrl] = useState(identity.source_url || '');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [viewGrade, setViewGrade] = useState({ grading_company: identity.grading_company, grade: identity.grade });
  const identityKey = JSON.stringify(identity);
  const activeSource = snapshot?.source || result?.source || source;
  const searchAction = source === 'ALT' ? 'research' : 'catalog/search';
  async function call(action, payload, quiet = false) {
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    const current = ++serial.current; if (!quiet) { setBusy(true); setError(''); }
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (accountId) headers['X-Lifestyle-Account'] = encodeURIComponent(accountId);
      const response = await fetch(endpoint, { method: 'POST', headers, credentials: 'same-origin', cache: 'no-store', body: JSON.stringify({ action, payload }), signal: abort.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Pricing is temporarily unavailable.');
      return current === serial.current ? data : null;
    } catch (e) { if (current === serial.current && e.name !== 'AbortError') setError(e.message || 'Pricing is temporarily unavailable.'); return null; }
    finally { if (current === serial.current) setBusy(false); }
  }
  async function search() {
    polls.current = 0;
    setResult(null); setSnapshot(null);
    const data = await call(searchAction, activeSource === 'ALT' ? { ...identity, title: query, source_url: sourceUrl } : { query, limit: 12 });
    if (data) { setResult(data); setSnapshot(data.snapshot || null); }
  }
  useEffect(() => {
    polls.current = 0;
    setQuery(identity.title || ''); setSourceUrl(identity.source_url || ''); setResult(null); setSnapshot(null);
    setViewGrade({ grading_company: identity.grading_company, grade: identity.grade });
    let cancelled = false;
    if (autoLoad && identity.title?.length >= 2) {
      const timer = setTimeout(async () => {
        const data = await call(searchAction, activeSource === 'ALT' ? identity : { query: identity.title, limit: 12 });
        if (!cancelled && data) { setResult(data); setSnapshot(data.snapshot || null); }
      }, 250);
      return () => { cancelled = true; clearTimeout(timer); ++serial.current; controller.current?.abort(); };
    }
    return () => { cancelled = true; ++serial.current; controller.current?.abort(); };
    // Identity changes intentionally reset old results and cancel in-flight reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityKey, source, endpoint, accountId, autoLoad]);
  async function choose(card) {
    setSnapshot(null);
    const data = await call(activeSource === 'ALT' ? 'lookup' : activeSource === 'Collectr' ? 'collectr/lookup' : 'tcg/lookup', activeSource === 'ALT'
      ? { asset_id: card.id, ...viewGrade, autograph: identity.autograph || null, qualifier: identity.qualifier || null, subgrades: identity.subgrades || {} }
      : activeSource === 'Collectr' ? {query: result.query, limit: result.limit, product_id: card.product_id, printing: card.printing}
      : { product_id: card.product_id });
    if (data) setSnapshot(data);
  }
  async function compare(value) {
    const [grading_company, grade] = JSON.parse(value); const selected = { grading_company, grade }; setViewGrade(selected);
    const data = await call('lookup', { asset_id: snapshot.asset_id, ...selected, autograph: identity.autograph || null, qualifier: identity.qualifier || null, subgrades: identity.subgrades || {} });
    if (data) setSnapshot(data);
  }
  async function selectSku(value) {
   
    const data = await call('tcg/lookup', { product_id: snapshot.product_id, sku_id: value ? Number(value) : null });
    if (data) setSnapshot(data);
  }
  const candidates = result?.candidates || result?.cards || [];
  const estimate = snapshot?.estimated_value;
  const freshness = Object.values(snapshot?.freshness || {});
  const stale = freshness.some(x => x.stale && x.available);
  const refreshing = freshness.some(x => x.refresh_in_progress);
  const grades = snapshot?.available_grade_variants || [];
  const variants = [...new Map(grades.map(g => [JSON.stringify([g.grading_company, g.source_grade_code]), g])).values()].sort((a,b) => a.grading_company.localeCompare(b.grading_company) || Number(b.source_grade_code)-Number(a.source_grade_code));
  const image = activeSource === 'ALT' ? snapshot?.images?.find(x => safeLink(x.url))?.url : snapshot?.image_url;
  const submittedGrade = result?.submitted_identity || identity;
  const comparing = snapshot && activeSource === 'ALT' && (snapshot.grading_company !== submittedGrade.grading_company || Number(snapshot.grade) !== Number(submittedGrade.grade));
  useEffect(() => {
    if (!refreshing || busy || polls.current >= 6 || !snapshot) return;
    const timer = setTimeout(async () => {
      polls.current += 1;
      const data = await call(activeSource === 'ALT' ? 'lookup' : activeSource === 'Collectr' ? 'collectr/lookup' : 'tcg/lookup', activeSource === 'ALT'
        ? { asset_id: snapshot.asset_id, grading_company: snapshot.grading_company, grade: snapshot.grade, autograph: snapshot.autograph, qualifier: snapshot.qualifier, subgrades: snapshot.subgrades }
        : activeSource === 'Collectr' ? snapshot.lookup_request
        : { product_id: snapshot.product_id, sku_id: snapshot.selected_sku?.sku || null }, true);
      if (data) setSnapshot(data);
    }, 5000);
    return () => clearTimeout(timer);
    // Bounded cache reads follow an active refresh; they never force provider reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, refreshing, busy, activeSource]);
  const searchControls = <>
    <div className="cr-search"><label htmlFor={prefix + '-query'}>Search cards<input id={prefix + '-query'} value={query} maxLength={240} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!busy) void search(); } }} /></label><button type="button" disabled={busy || query.trim().length < 2} onClick={search}>Search</button></div>
    {activeSource === 'ALT' && !snapshot && sourceUrl && <label className="cr-field" htmlFor={prefix + '-alt-link'}>Card link<input id={prefix + '-alt-link'} type="url" maxLength={300} value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} /></label>}
    {!snapshot && result && !candidates.length && <p>No matching card found. Try the card number or set name.</p>}
    {!!candidates.length && <div className="cr-candidates">{candidates.map(card => <div className="cr-candidate" key={card.id || `${card.product_id}:${card.printing || ''}`}>
      <div><b>{card.name}</b><small>{[card.category, card.set, card.card_number && '#' + card.card_number].filter(Boolean).join(' · ')}</small>{card.conflicts?.length > 0 && <small>Different {card.conflicts.join(', ')}</small>}</div>
      <button type="button" disabled={busy || (activeSource === 'ALT' && (!viewGrade.grading_company || !viewGrade.grade))} onClick={() => choose(card)}>Select</button>
    </div>)}</div>}
  </>;
  return <section className="cr-panel" aria-label="Card valuation">
    {!snapshot && searchControls}
    {busy && !snapshot && <p role="status" className="cr-empty">Finding your card…</p>}
    {error && !snapshot && <p className="cr-error" role="alert">Pricing is temporarily unavailable. Please try again.</p>}
    {snapshot && <>
      <div className="cr-hero">{image ? <img src={image} alt={snapshot.title || 'Card'} loading="lazy" referrerPolicy="no-referrer" /> : <span>Image unavailable</span>}</div>
      <div className="cr-identity">
        <div className="cr-meta"><span>{snapshot.category || snapshot.brand}</span><span>{snapshot.card_number && '#' + snapshot.card_number}</span></div>
        <h3>{snapshot.title}</h3>
        {snapshot.set && <p>{snapshot.set}</p>}
      </div>
      <div className="cr-body">
        {activeSource === 'ALT' && !!variants.length && <label className="cr-variant" htmlFor={prefix + '-grade'}><span className="cr-sr-only">Grader and grade</span><select id={prefix + '-grade'} disabled={busy} value={JSON.stringify([snapshot.grading_company, snapshot.grade])} onChange={e => compare(e.target.value)}>{!variants.some(g => g.grading_company === snapshot.grading_company && g.source_grade_code === snapshot.grade) && <option value={JSON.stringify([snapshot.grading_company, snapshot.grade])}>{snapshot.grading_company} {snapshot.grade_identity?.grade_label || snapshot.grade}</option>}{variants.map(g => <option key={JSON.stringify([g.grading_company, g.source_grade_code])} value={JSON.stringify([g.grading_company, g.source_grade_code])}>{g.grading_company} {g.grade_label}</option>)}</select></label>}
        {activeSource === 'ALT' && !variants.length && <div className="cr-variant-label">{snapshot.grading_company} {snapshot.grade_identity?.grade_label || snapshot.grade}</div>}
        {activeSource === 'TCGplayer' && <label className="cr-variant" htmlFor={prefix + '-sku'}><span className="cr-sr-only">Printing, language and condition</span><select id={prefix + '-sku'} value={snapshot.selected_sku?.sku || ''} disabled={busy} onChange={e => selectSku(e.target.value)}><option value="">{snapshot.printing || 'Choose variant'}</option>{snapshot.sku_prices.map(sku => <option key={sku.sku} value={sku.sku}>{sku.variant} · {sku.language} · {sku.condition}</option>)}</select></label>}
        {activeSource === 'Collectr' && snapshot.printing && <div className="cr-variant-label">{snapshot.printing}</div>}
        {comparing && <small className="cr-comparison">Submitted: {identity.grading_company} {identity.grade}</small>}
        {activeSource === 'ALT' && !!variants.length && <div className="cr-population"><span className="cr-value-label">POPULATION · {snapshot.grading_company}</span><div className="cr-pop-grid">{variants.filter(g=>g.grading_company===snapshot.grading_company).map(g=><button type="button" key={g.source_grade_code} disabled={busy} aria-pressed={g.source_grade_code===snapshot.grade} onClick={()=>compare(JSON.stringify([g.grading_company,g.source_grade_code]))}><small>{g.grade_label}</small><strong>{g.population_reported==null?'—':Number(g.population_reported).toLocaleString()}</strong></button>)}</div></div>}
        {activeSource === 'ALT' ? <div className="cr-valuation" aria-live="polite"><span className="cr-value-label">ESTIMATED VALUE</span><strong className="cr-value-amount">{money(estimate?.amount)}</strong>{estimate?.lower_bound != null && estimate?.upper_bound != null && <span className="cr-range">{money(estimate.lower_bound)}–{money(estimate.upper_bound)}</span>}<small className="cr-updated">{stale?'Updating · ':''}{estimate?.retrieved_at?`Updated ${new Date(estimate.retrieved_at).toLocaleDateString()}`:'Value unavailable'}</small></div> : <CombinedValue snapshot={snapshot} endpoint={endpoint} accountId={accountId} context={identityKey+endpoint+accountId}/>}
        {activeSource === 'ALT' && <details className="cr-transactions"><summary>Recent sales<span>{snapshot.recent_sales?.length || 0}</span></summary>{!snapshot.recent_sales?.length ? <p>No recent sales for this grade.</p> : snapshot.recent_sales.map(sale=><div className="cr-sale" key={sale.sale_id}><div><b>{sale.sale_type?.replaceAll('_',' ')}</b><small>{saleDate(sale.date)} · {sale.auction_house}</small></div><div><strong>{money(sale.amount)}</strong>{sale.price_status!=='source_reported_transaction_amount'&&<small>{saleLabels[sale.price_status]||'Unverified amount'}</small>}</div></div>)}</details>}
        <details className="cr-change"><summary>Change card</summary>{searchControls}</details>
      </div>
    </>}
  </section>;
}
