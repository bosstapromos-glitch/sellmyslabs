'use client';
import {useEffect, useState} from 'react';
const money = value => value == null || !Number.isFinite(Number(value)) ? 'Unavailable' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:2}).format(value);
function reference(snapshot) {
  if (snapshot?.source === 'TCGplayer') return {source:'TCGplayer',product_id:snapshot.product_id,sku_id:snapshot.selected_sku?.sku||null};
  if (snapshot?.source === 'Collectr') return {source:'Collectr',...snapshot.lookup_request};
  return null;
}
export default function CombinedValue({snapshot,endpoint,accountId='',context}) {
  const [response,setResponse] = useState(null);
  const referenceKey = JSON.stringify(reference(snapshot));
  const freshnessKey = JSON.stringify(snapshot?.freshness||{});
  const requestKey = JSON.stringify([referenceKey,freshnessKey,context,endpoint,accountId]);
  useEffect(()=>{
    const current=JSON.parse(referenceKey);
    if(!current)return;
    const abort=new AbortController();let active=true;
    const headers={'Content-Type':'application/json'};
    if(accountId)headers['X-Lifestyle-Account']=encodeURIComponent(accountId);
    // Counterpart discovery, eligibility and arithmetic run on the server.
    fetch(endpoint,{method:'POST',headers,credentials:'same-origin',cache:'no-store',signal:abort.signal,
      body:JSON.stringify({action:'consensus',payload:{references:[current]}})})
      .then(async res=>{if(!res.ok)throw Error('unavailable');const data=await res.json();if(active)setResponse({key:requestKey,data});})
      .catch(()=>{if(active)setResponse({key:requestKey,data:null});});
    return()=>{active=false;abort.abort();};
  },[referenceKey,requestKey,endpoint,accountId]);
  const result=response?.key===requestKey?response.data:null;
  const estimate=snapshot?.estimated_value;
  const amount=result?.amount??result?.reference_value??estimate?.amount;
  // The age belongs to the source data, not to the time we calculated an average.
  const included=result?.sources?.filter(row=>row.included&&row.checked_at)||[];
  const checked=included.length?included.map(row=>row.checked_at).sort()[0]:estimate?.retrieved_at;
  const stale=Object.values(snapshot?.freshness||{}).some(row=>row.stale&&row.available);
  return <div className="cr-valuation" aria-live="polite">
    <span className="cr-value-label">ESTIMATED VALUE</span>
    <strong className="cr-value-amount">{money(amount)}</strong>
    <small className="cr-updated">{stale?'Updating · ':''}{checked?`Updated ${new Date(checked).toLocaleDateString()}`:'Checking price…'}</small>
  </div>;
}
