// Lock the submission first, just like owner saves, to serialize acceptance
// against revised offers and closing a request. The receipt is queued atomically.
export const ACCEPT_PURCHASE_SQL = `
WITH current AS MATERIALIZED (
 SELECT s.* FROM submissions s JOIN offer_emails e ON e.submission_id=s.id
 WHERE e.id=$1::uuid FOR UPDATE OF s
), accepted AS (
 UPDATE offer_emails e SET accepted_at=$3::timestamptz,accepted_name=$2
 FROM current s WHERE e.id=$1::uuid AND e.submission_id=s.id
 AND e.purchase_snapshot IS NOT NULL AND e.accepted_at IS NULL AND e.responded_at IS NULL
 AND e.version=s.offer_version AND e.amount=s.offer
 AND s.status NOT IN ('Closed','Paid')
 RETURNING e.id,e.submission_id,e.accepted_at,e.accepted_name
), marked AS (
 UPDATE submissions s SET status='Agreed',edit_version=edit_version+1,updated_at=now()
 FROM accepted a WHERE s.id=a.submission_id RETURNING s.id
), receipt AS (
 INSERT INTO purchase_receipts(offer_id,payload)
 SELECT id,$4::jsonb FROM accepted ON CONFLICT(offer_id) DO NOTHING RETURNING offer_id
)
SELECT * FROM accepted`;

export const PURCHASE_OFFER_SQL = `
SELECT e.id,e.version,e.amount,e.purchase_snapshot,e.accepted_at,e.accepted_name,e.responded_at,e.response_name,e.response,
 e.payload->'to' AS recipients,
 (e.version=s.offer_version AND e.amount=s.offer) AS is_current,
 (e.version=s.offer_version AND e.amount=s.offer AND e.responded_at IS NULL AND s.status NOT IN ('Closed','Paid')) AS can_accept,
 r.status AS receipt_status,r.sent_at AS receipt_sent_at
FROM offer_emails e JOIN submissions s ON s.id=e.submission_id
LEFT JOIN purchase_receipts r ON r.offer_id=e.id
WHERE e.id=$1::uuid AND e.purchase_snapshot IS NOT NULL`;

export const CLAIM_PURCHASE_RECEIPT_SQL = `
UPDATE purchase_receipts SET status='sending',first_attempt_at=coalesce(first_attempt_at,now()),
 locked_until=now()+interval '2 minutes',lease_id=$2::uuid,error=NULL
WHERE offer_id=$1::uuid AND status IN ('pending','failed','sending')
 AND (locked_until IS NULL OR locked_until<now())
 AND (first_attempt_at IS NULL OR first_attempt_at>now()-interval '23 hours')
RETURNING *`;

export function publicPurchaseOffer(row) {
  if (!row) return null;
  return {
    snapshot: row.purchase_snapshot,
    acceptedName: row.accepted_name,
    acceptedAt: row.accepted_at,
    response: row.response || null,
    responseName: row.response_name || null,
    respondedAt: row.responded_at || null,
    isCurrent: row.is_current,
    canAccept: !row.accepted_at && row.can_accept,
    receiptSent: row.receipt_status === "sent",
  };
}

// A response and its confirmation are saved together, serialized with owner revisions.
export const RESPOND_PURCHASE_SQL = `
WITH current AS MATERIALIZED (
 SELECT s.* FROM submissions s JOIN offer_emails e ON e.submission_id=s.id WHERE e.id=$1::uuid FOR UPDATE OF s
), responded AS (
 UPDATE offer_emails e SET responded_at=$3::timestamptz,response_name=$2,response=$4::jsonb FROM current s
 WHERE e.id=$1::uuid AND e.submission_id=s.id AND e.purchase_snapshot IS NOT NULL
 AND e.accepted_at IS NULL AND e.responded_at IS NULL
 AND e.version=s.offer_version AND e.amount=s.offer AND s.status NOT IN ('Closed','Paid')
 RETURNING e.*
), marked AS (
 UPDATE submissions s SET status=CASE r.response->>'action' WHEN 'counter' THEN 'Counter received' ELSE 'Seller declined' END,
 edit_version=edit_version+1,updated_at=now() FROM responded r WHERE s.id=r.submission_id RETURNING s.id
), receipt AS (
 INSERT INTO purchase_receipts(offer_id,payload) SELECT id,$5::jsonb FROM responded
 ON CONFLICT(offer_id) DO NOTHING RETURNING offer_id
)
SELECT * FROM responded`;

export const PURCHASE_HISTORY_SQL = `SELECT id,amount,accepted_at,accepted_name,responded_at,response_name,response FROM offer_emails WHERE submission_id=$1::uuid AND (accepted_at IS NOT NULL OR responded_at IS NOT NULL) ORDER BY coalesce(responded_at,accepted_at) DESC,id DESC`;
