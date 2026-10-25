import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { offerMessage } from '../lib/offer-message';
import { SAVE_OFFER_SQL, CLAIM_OFFER_SQL, OFFER_SUMMARY_SQL } from '../lib/offer-records';
import { deliverOffer } from '../lib/offer-delivery';
import { updateSchema } from '../lib/validation';
const id = randomUUID();
const submission = { id, seller_name: 'Test Seller', email: 'seller@example.com', internal_notes: 'NEVER EMAIL THIS', cards: [{ name: 'Charizard', grader: 'TAG', grade: '9', quantity: 2 }] };
const payload = offerMessage(submission, '280', { from: 'requests@example.com', replyTo: 'owner@example.com', site: 'https://example.com' });
test('owner offers accept USD formatting and reject ambiguous prices', () => {
  const parse = offer => updateSchema.safeParse({ id, status: 'Offer ready', notes: '', offer });
  for (const [input, expected] of [['$80.00', '80.00'], ['$1,200', '1200'], ['  $ 1,200.50  ', '1200.50'], ['80', '80'], ['  ', '']]) {
    const result = parse(input);
    assert.equal(result.success, true, input);
    assert.equal(result.data.offer, expected);
  }
  for (const input of ['$0', '$-80', '80.001', '1,20', '80,00', '1.200,50', '$', '€80', '1e3', '$1000000000000', 'NaN']) {
    assert.equal(parse(input).success, false, input);
  }
});
test('seller offer uses total price, quantities and owner reply address without private notes', () => {
  assert.deepEqual(payload.to, ['seller@example.com']);
  assert.equal(payload.reply_to, 'owner@example.com');
  assert.match(payload.text, /\$280.00 total for all 2 cards/);
  assert.match(payload.text, /TAG 9 · Qty 2/);
  assert.ok(!JSON.stringify(payload).includes('NEVER EMAIL THIS'));
  for (const offer of ['0', '-1', '1000000000000', '12.123', '1e4']) assert.equal(updateSchema.safeParse({ id, status: 'New', notes: '', offer }).success, false);
});
test('price changes enqueue once, stale saves fail, notes do not resend, retries use one leased record', async () => {
  const db = new PGlite();
  try {
    const schema = await readFile(new URL('../scripts/schema.sql', import.meta.url), 'utf8');
    await db.exec(schema); await db.exec(schema);
    await db.query('INSERT INTO submissions(id,seller_name,email,cards) VALUES($1,$2,$3,$4)', [id, submission.seller_name, submission.email, JSON.stringify(submission.cards)]);
    const save = async (amount, version) => (await db.query(SAVE_OFFER_SQL, [id, 'Offer ready', 'Private notes', amount, version, randomUUID(), JSON.stringify(payload)])).rows[0];
    const first = await save('280', 0);
    assert.equal(first.offer_version, 1); assert.ok(first.queued_email);
    assert.equal(await save('280', 0), undefined);
    const same = await save('280.00', 1);
    assert.equal(same.offer_version, 1); assert.equal(same.queued_email, null);
    assert.equal((await db.query('SELECT * FROM offer_emails')).rows.length, 1);
    const claim = async (event) => (await db.query(CLAIM_OFFER_SQL, [event, randomUUID()])).rows;
    assert.equal((await claim(first.queued_email)).length, 1);
    assert.equal((await claim(first.queued_email)).length, 0);
    assert.equal(await save('290', 1), undefined, 'Cannot change offer while email is in flight');
    await db.query("UPDATE offer_emails SET status='failed',locked_until=NULL WHERE id=$1", [first.queued_email]);
    assert.equal((await db.query(OFFER_SUMMARY_SQL, [id])).rows[0].can_retry, true);
    assert.equal((await claim(first.queued_email)).length, 1);
    await db.query("UPDATE offer_emails SET status='sent',sent_at=now(),locked_until=NULL WHERE id=$1", [first.queued_email]);
    assert.equal((await claim(first.queued_email)).length, 0);
    const next = await save('290', 1); assert.equal(next.offer_version, 2); assert.ok(next.queued_email);
    await db.query("UPDATE offer_emails SET first_attempt_at=now()-interval '24 hours',status='failed' WHERE id=$1", [next.queued_email]);
    assert.equal((await claim(next.queued_email)).length, 0, 'Do not resend beyond provider deduplication window');
    const current = await save('300', 2);
    const sql = async (strings, ...params) => (await db.query(strings.reduce((q, part, i) => q + (i ? '$' + i : '') + part, ''), params)).rows;
    sql.query = async (query, params) => (await db.query(query, params)).rows;
    const calls = [];
    const originalKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = 'test-only';
    try {
      await deliverOffer(current.queued_email, { sql, fetchEmail: async (url, options) => { calls.push(options); throw Error('Connection interrupted'); } });
      assert.equal((await db.query(OFFER_SUMMARY_SQL, [id])).rows[0].status, 'failed');
      await deliverOffer(current.queued_email, { sql, fetchEmail: async (url, options) => { calls.push(options); return Response.json({ id: 'provider-test' }); } });
      assert.equal((await db.query(OFFER_SUMMARY_SQL, [id])).rows[0].status, 'sent');
      assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
      assert.equal(calls[0].body, calls[1].body);
      await deliverOffer(current.queued_email, { sql, fetchEmail: async () => { throw Error('Must not resend'); } });
      assert.equal((await db.query(OFFER_SUMMARY_SQL, [id])).rows[0].status, 'sent');
    } finally {
      if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
    }
    const cleared = await save(null, 3); assert.equal(cleared.queued_email, null);
    assert.equal((await claim(next.queued_email)).length, 0, 'Do not send an outdated offer');
  } finally { await db.close(); }
});

test('mixed offers describe raw cards and sealed products without fake grades', () => {
  const mixed = offerMessage({ ...submission, cards: [
    ...submission.cards,
    { name: 'Pikachu', itemType: 'Raw card', condition: 'Edge wear', quantity: 1 },
    { name: 'Booster box', itemType: 'Sealed product', condition: 'Factory sealed', quantity: 1 },
  ] }, '500', { from: 'requests@example.com', replyTo: 'owner@example.com', site: 'https://example.com' });
  assert.match(mixed.text, /\$500.00 total for all 4 items/);
  assert.match(mixed.text, /Pikachu — Raw card · Edge wear/);
  assert.match(mixed.text, /Booster box — Sealed product · Factory sealed/);
  assert.ok(!mixed.text.includes('undefined'));
});
