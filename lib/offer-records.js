// Save the price and its immutable email together. Version checks reject stale tabs.
export const SAVE_OFFER_SQL = `
WITH previous AS MATERIALIZED (
 SELECT * FROM submissions WHERE id=$1::uuid FOR UPDATE
), updated AS (
 UPDATE submissions s SET status=$2,internal_notes=$3,offer=$4::numeric,
 offer_version=p.offer_version+CASE WHEN p.offer IS DISTINCT FROM $4::numeric THEN 1 ELSE 0 END,
 updated_at=now()
 FROM previous p WHERE s.id=p.id AND p.offer_version=$5::integer
 AND NOT EXISTS (SELECT 1 FROM offer_emails e WHERE e.submission_id=s.id AND e.status='sending' AND e.locked_until>now())
 RETURNING s.*,p.offer AS previous_offer
), queued AS (
 INSERT INTO offer_emails(id,submission_id,version,amount,payload)
 SELECT $6::uuid,id,offer_version,offer,$7::jsonb FROM updated
 WHERE offer IS NOT NULL AND offer IS DISTINCT FROM previous_offer
 RETURNING id
)
SELECT id,offer,offer_version,status,internal_notes,(SELECT id FROM queued) AS queued_email FROM updated`;

export const CLAIM_OFFER_SQL = `
UPDATE offer_emails e SET status='sending',first_attempt_at=coalesce(first_attempt_at,now()),
 locked_until=now()+interval '2 minutes',lease_id=$2::uuid,error=NULL
WHERE e.id=$1::uuid AND e.status IN ('pending','failed','sending')
 AND (e.locked_until IS NULL OR e.locked_until<now())
 AND (e.first_attempt_at IS NULL OR e.first_attempt_at>now()-interval '23 hours')
 AND EXISTS (SELECT 1 FROM submissions s WHERE s.id=e.submission_id AND s.offer_version=e.version AND s.offer=e.amount)
RETURNING e.*`;

export const OFFER_SUMMARY_SQL = `SELECT id,amount,CASE WHEN status='sending' AND locked_until<now() THEN 'failed' ELSE status END AS status,sent_at,created_at,error,
 (status IN ('pending','failed','sending') AND (locked_until IS NULL OR locked_until<now())
 AND (first_attempt_at IS NULL OR first_attempt_at>now()-interval '23 hours')
 AND version=(SELECT offer_version FROM submissions WHERE id=$1::uuid)) AS can_retry
 FROM offer_emails WHERE submission_id=$1::uuid ORDER BY version DESC LIMIT 1`;
