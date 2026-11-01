import test from 'node:test';
import assert from 'node:assert/strict';
import { emailDeliveryStatus } from '../lib/email-status';

test('delivery lookup distinguishes accepted, delivered and failed emails using read-only requests', async () => {
  for (const [event, label, tone] of [['sent', 'Sent · awaiting delivery', 'pending'], ['delivered', 'Delivered', 'success'], ['delivery_delayed', 'Delivery delayed', 'warning'], ['bounced', 'Not delivered', 'error'], ['complained', 'Marked as spam', 'error']]) {
    const result = await emailDeliveryStatus('email-123', { apiKey: 'test', fetchEmail: async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails/email-123');
      assert.equal(options.method, undefined);
      assert.equal(options.body, undefined);
      assert.equal(options.cache, 'no-store');
      return Response.json({ last_event: event });
    } });
    assert.equal(result.label, label);
    assert.equal(result.tone, tone);
    assert.ok(result.checked_at);
  }
});

test('provider errors and unknown events never claim successful or failed delivery', async () => {
  for (const fetchEmail of [async () => Response.json({}, { status: 429 }), async () => { throw Error('timeout'); }, async () => Response.json({ last_event: 'new_event' })]) {
    const result = await emailDeliveryStatus('email-123', { apiKey: 'test', fetchEmail });
    assert.equal(result.status, 'unavailable');
    assert.equal(result.checked_at, null);
  }
});

test('missing provider record does not contact the provider', async () => {
  const result = await emailDeliveryStatus(null, { apiKey: 'test', fetchEmail: async () => { assert.fail('Unexpected lookup'); } });
  assert.equal(result.status, 'unavailable');
});
