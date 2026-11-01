import { signedIn, sameOrigin, limited } from '../../../../lib/security';
import { catalogBody, requestCatalog } from '../../../../lib/catalog-server';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request) {
  if (!sameOrigin(request) || !(await signedIn())) return Response.json({ error: 'Sign in as the owner to research prices.' }, { status: 401 });
  try {
    if (await limited(request, 'catalog-research', 600)) return Response.json({ error: 'Please wait before researching more cards.' }, { status: 429 });
    const { action, payload } = await catalogBody(request);
    const result = await requestCatalog(action, payload);
    return Response.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return Response.json({ error: error.message || 'Card research is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
