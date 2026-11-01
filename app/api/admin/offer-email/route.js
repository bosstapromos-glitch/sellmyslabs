import { signedIn, sameOrigin } from '../../../../lib/security';
import { db } from '../../../../lib/db';
import { deliverOffer, offerEmailSummary } from '../../../../lib/offer-delivery';
export async function GET(request) {
  if (!(await signedIn())) return Response.json({ error: 'Please sign in again.' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('submissionId');
  if (!id || !/^[a-f\d-]{36}$/i.test(id)) return Response.json({ error: 'Invalid request.' }, { status: 400 });
  try {
    return Response.json({ offer_email: await offerEmailSummary(id) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Could not check delivery. Please try again.' }, { status: 503 });
  }
}
export async function POST(request) {
  if (!sameOrigin(request) || !(await signedIn())) return Response.json({ error: 'Please sign in again.' }, { status: 401 });
  try {
    const { id } = await request.json();
    if (typeof id !== 'string' || !/^[a-f\d-]{36}$/i.test(id)) return Response.json({ error: 'Invalid request.' }, { status: 400 });
    const [email] = await db()`SELECT submission_id FROM offer_emails WHERE id=${id}`;
    if (!email) return Response.json({ error: 'Email not found.' }, { status: 404 });
    const current = await offerEmailSummary(email.submission_id);
    if (current?.id !== id || !current.can_retry) return Response.json({ error: 'This email cannot be retried. Refresh the request and check the email status.' }, { status: 409 });
    await deliverOffer(id);
    return Response.json({ offer_email: await offerEmailSummary(email.submission_id) });
  } catch {
    return Response.json({ error: 'Could not retry the email. Refresh to check its status.' }, { status: 503 });
  }
}
