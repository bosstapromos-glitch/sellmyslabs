'use client';
import { useEffect, useId, useRef, useState } from 'react';
import './reference.css';

const money = value => value == null || value === '' || !Number.isFinite(Number(value)) ? 'Unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : 'Not supplied';
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
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirmed, setConfirmed] = useState(false);
  const [viewGrade, setViewGrade] = useState({ grading_company: identity.grading_company, grade: identity.grade });
  const identityKey = JSON.stringify(identity);
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
    setConfirmed(false); setResult(null); setSnapshot(null);
    const data = await call(source === 'ALT' ? 'research' : 'tcg/search', source === 'ALT' ? { ...identity, title: query, source_url: sourceUrl } : { query, limit: 12 });
    if (data) { setResult(data); setSnapshot(data.snapshot || null); }
  }
  useEffect(() => {
    polls.current = 0;
    setQuery(identity.title || ''); setSourceUrl(identity.source_url || ''); setResult(null); setSnapshot(null); setConfirmed(false);
    setViewGrade({ grading_company: identity.grading_company, grade: identity.grade });
    let cancelled = false;
    if (autoLoad && identity.title?.length >= 2) {
      const timer = setTimeout(async () => {
        const data = await call(source === 'ALT' ? 'research' : 'tcg/search', source === 'ALT' ? identity : { query: identity.title, limit: 12 });
        if (!cancelled && data) { setResult(data); setSnapshot(data.snapshot || null); }
      }, 250);
      return () => { cancelled = true; clearTimeout(timer); ++serial.current; controller.current?.abort(); };
    }
    return () => { cancelled = true; ++serial.current; controller.current?.abort(); };
    // Identity changes intentionally reset old results and cancel in-flight reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityKey, source, endpoint, accountId, autoLoad]);
  async function choose(card) {
    setConfirmed(false); setSnapshot(null);
    const data = await call(source === 'ALT' ? 'lookup' : 'tcg/lookup', source === 'ALT'
      ? { asset_id: card.id, ...viewGrade, autograph: identity.autograph || null, qualifier: identity.qualifier || null, subgrades: identity.subgrades || {} }
      : { product_id: card.product_id });
    if (data) setSnapshot(data);
  }
  async function compare(value) {
    const [grading_company, grade] = JSON.parse(value); const selected = { grading_company, grade }; setViewGrade(selected); setConfirmed(false);
    const data = await call('lookup', { asset_id: snapshot.asset_id, ...selected, autograph: identity.autograph || null, qualifier: identity.qualifier || null, subgrades: identity.subgrades || {} });
    if (data) setSnapshot(data);
  }
  async function selectSku(value) {
    setConfirmed(false);
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
  const image = source === 'ALT' ? snapshot?.images?.find(x => safeLink(x.url))?.url : snapshot?.image_url;
  const submittedGrade = result?.submitted_identity || identity;
  const comparing = snapshot && source === 'ALT' && (snapshot.grading_company !== submittedGrade.grading_company || Number(snapshot.grade) !== Number(submittedGrade.grade));
  useEffect(() => {
    if (!refreshing || busy || polls.current >= 6 || !snapshot) return;
    const timer = setTimeout(async () => {
      polls.current += 1;
      const data = await call(source === 'ALT' ? 'lookup' : 'tcg/lookup', source === 'ALT'
        ? { asset_id: snapshot.asset_id, grading_company: snapshot.grading_company, grade: snapshot.grade, autograph: snapshot.autograph, qualifier: snapshot.qualifier, subgrades: snapshot.subgrades }
        : { product_id: snapshot.product_id, sku_id: snapshot.selected_sku?.sku || null }, true);
      if (data) setSnapshot(data);
    }, 5000);
    return () => clearTimeout(timer);
    // Bounded cache reads follow an active refresh; they never force provider reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, refreshing, busy, source]);
  return <section className="cr-panel" aria-label={`${source} card research`}>
    <div className="cr-heading"><strong>{source === 'ALT' ? 'ALT · Graded card research' : 'TCGplayer · Ungraded & sealed research'}</strong><span>USD</span></div>
    <div className="cr-search"><label htmlFor={prefix + '-query'}>Card title, set or collector number<input id={prefix + '-query'} value={query} maxLength={240} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!busy) void search(); } }} /></label><button type="button" disabled={busy || query.trim().length < 2} onClick={search}>Search</button></div>
    {busy && <p role="status">{snapshot ? 'Checking this reference…' : 'Finding matches and checking prices…'}</p>}
    {source === 'ALT' && <label className="cr-field" htmlFor={prefix + '-alt-link'}>ALT listing link (optional)<input id={prefix + '-alt-link'} type="url" maxLength={300} value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://alt.xyz/itm/…/external" /></label>}
    {error && <p className="cr-error" role="alert">{error}</p>}
    {result?.message && <p>{result.message}</p>}
    {result && !candidates.length && <p>No matching card found. Try the collector number or a shorter set name.</p>}
    {!!candidates.length && <details className="cr-candidates" open={!snapshot}><summary>{candidates.length} possible {candidates.length === 1 ? 'match' : 'matches'} · check the exact printing</summary>{candidates.map(card => <div className="cr-candidate" key={card.id || card.product_id}>
      <div><b>{card.name}</b><small>{[card.category, card.set, card.card_number && '#' + card.card_number].filter(Boolean).join(' · ')}</small>{card.conflicts?.length > 0 && <small className="cr-error">Conflicting details: {card.conflicts.join(', ')}</small>}</div>
      <button type="button" disabled={busy || (source === 'ALT' && (!viewGrade.grading_company || !viewGrade.grade))} onClick={() => choose(card)}>Review</button>
    </div>)}</details>}
    {snapshot && <>
      <div className="cr-reference">{image && <img src={image} alt="Catalog reference, not the seller’s card" loading="lazy" referrerPolicy="no-referrer" />}<div><small>Catalog reference</small><h3>{snapshot.title}</h3><p>{[snapshot.set || snapshot.brand, snapshot.card_number && '#' + snapshot.card_number].filter(Boolean).join(' · ')}</p>{source === 'ALT' && <b>{snapshot.grading_company} {snapshot.grade_identity?.grade_label || snapshot.grade}</b>}{snapshot.source_url && <p><a href={safeLink(snapshot.source_url)} target="_blank" rel="noopener noreferrer">View on TCGplayer ↗</a></p>}</div></div>
      {source === 'ALT' && !!variants.length && <label className="cr-field" htmlFor={prefix + '-grade'}>Grade being researched<select id={prefix + '-grade'} disabled={busy} value={JSON.stringify([snapshot.grading_company, snapshot.grade])} onChange={e => compare(e.target.value)}>{!variants.some(g => g.grading_company === snapshot.grading_company && g.source_grade_code === snapshot.grade) && <option value={JSON.stringify([snapshot.grading_company, snapshot.grade])}>{snapshot.grading_company} {snapshot.grade_identity?.grade_label || snapshot.grade}</option>}{variants.map(g => <option key={JSON.stringify([g.grading_company, g.source_grade_code])} value={JSON.stringify([g.grading_company, g.source_grade_code])}>{g.grading_company} {g.grade_label} · population {g.population_reported ?? 'unavailable'}</option>)}</select></label>}
      {comparing && <p className="cr-notice">Comparison grade. Submitted grade: {identity.grading_company} {identity.grade}.</p>}
      {source === 'TCGplayer' && <label className="cr-field" htmlFor={prefix + '-sku'}>Printing · language · condition<select id={prefix + '-sku'} value={snapshot.selected_sku?.sku || ''} disabled={busy} onChange={e => selectSku(e.target.value)}><option value="">Choose the exact combination</option>{snapshot.sku_prices.map(sku => <option key={sku.sku} value={sku.sku}>{sku.variant} · {sku.language} · {sku.condition}</option>)}</select></label>}
      <p className="cr-notice">{confirmed ? 'Card identity confirmed for this research view.' : 'Suggested reference — confirm the set, number, language and parallel before using this estimate.'}</p>
      <label className="cr-confirm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I checked the exact card and printing{source === 'ALT' ? ', grader and grade' : ', language and condition'}.</label>
      <div className="cr-price"><span>{estimate?.type || 'Market estimate'}</span><strong>{money(estimate?.amount)}</strong>{estimate?.lower_bound != null && estimate?.upper_bound != null && <span>Estimated range {money(estimate.lower_bound)}–{money(estimate.upper_bound)}</span>}</div>
      <p className="cr-small">Checked {date(estimate?.retrieved_at)}{estimate?.provider_as_of ? ` · Source calculated ${date(estimate.provider_as_of)}` : ''}</p>
      {(stale || refreshing) && <p className="cr-notice" role="status">{stale ? 'Cached data is past its refresh time. ' : ''}{refreshing ? 'A background refresh is running.' : 'The last successful result is shown; refresh will retry.'}</p>}
      {source === 'TCGplayer' && !snapshot.selected_sku && <p>Choose a condition-specific SKU for a value. A missing price stays unavailable.</p>}
      {source === 'ALT' && <>
        <details><summary>Population by grading company and grade</summary><div className="cr-scroll"><table><thead><tr><th>Grader</th><th>Grade</th><th>Population</th></tr></thead><tbody>{grades.map((g, i) => <tr key={i}><td>{g.grading_company}</td><td>{g.grade_label}</td><td>{g.population_reported ?? 'Unavailable'}</td></tr>)}</tbody></table></div><p className="cr-small">Checked {date(snapshot.population_as_of)}. Population does not establish pricing availability.</p></details>
        <details open><summary>Recent reported transactions</summary>{!snapshot.recent_sales?.length ? <p>No comparable transactions are available for this exact grade and variant.</p> : <div className="cr-scroll"><table><thead><tr><th>Date / venue</th><th>Type</th><th>Amount</th></tr></thead><tbody>{snapshot.recent_sales.map(sale => <tr key={sale.sale_id}><td>{saleDate(sale.date)}<small>{sale.auction_house}</small>{safeLink(sale.source_url) && <a href={sale.source_url} target="_blank" rel="noopener noreferrer">Source ↗</a>}</td><td>{sale.sale_type?.replaceAll('_', ' ')}<small>{saleLabels[sale.price_status] || 'Review source amount'}{sale.label ? ` · ${sale.label}` : ''}</small></td><td>{money(sale.amount)}</td></tr>)}</tbody></table></div>}<p className="cr-small">Transactions checked {date(snapshot.sales_as_of)}. Listing prices and unverified best offers are not confirmed sale prices.</p></details>
      </>}
      <p className="cr-small">Reference research only. Your photos, asking price and offer are unchanged.</p>
    </>}
  </section>;
}
