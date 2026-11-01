import 'server-only';
import { getVercelOidcToken } from '@vercel/oidc';

const actions = new Set(['research', 'lookup', 'tcg/search', 'tcg/lookup', 'collectr/search', 'collectr/lookup', 'prewarm']);
export function catalogConfigured() {
  return process.env.CATALOG_REFERENCE_ENABLED === '1' && Boolean(process.env.CATALOG_API_URL && process.env.CATALOG_APP_KEY?.length >= 32);
}
export async function requestCatalog(action, payload) {
  if (!actions.has(action)) throw new Error('Choose a supported research action.');
  if (!catalogConfigured()) throw new Error('Card pricing is not connected in this environment yet.');
  const base = new URL(process.env.CATALOG_API_URL);
  const local = !process.env.VERCEL && ['127.0.0.1', 'localhost'].includes(base.hostname);
  if (base.protocol !== 'https:' && !local) throw new Error('The pricing service is unavailable.');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CATALOG_APP_KEY}` };
  if (process.env.VERCEL) {
    const oidc = await getVercelOidcToken();
    if (!oidc) throw new Error('The protected pricing connection is unavailable.');
    headers['x-vercel-trusted-oidc-idp-token'] = oidc;
  }
  const response = await fetch(new URL(`/v1/${action}`, base), {
    method: 'POST', headers, body: JSON.stringify(payload), cache: 'no-store',
    signal: AbortSignal.timeout(action === 'prewarm' ? 10000 : 45000),
  });
  if (!response.ok) throw new Error(response.status === 422 ? 'Check the card identity and grade, then try again.' : 'Pricing is temporarily unavailable. Please retry shortly.');
  return response.json();
}
export async function catalogBody(request) {
  if (!(request.headers.get('content-type') || '').startsWith('application/json')) throw new Error('Use a JSON request.');
  const reader = request.body?.getReader(); let size = 0, text = ''; const decoder = new TextDecoder();
  if (reader) try {
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength;
      if (size > 16000) { await reader.cancel(); throw new Error('Research request is too large.'); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  const body = JSON.parse(text);
  if (!body || typeof body !== 'object' || Array.isArray(body) || !actions.has(body.action) || body.action === 'prewarm') throw new Error('Choose a supported research action.');
  return body;
}
