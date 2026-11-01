// Save all seller-facing content and its immutable email together.
// Private notes/status never queue an email; version checks reject stale tabs.
export const SAVE_OFFER_SQL = `
WITH previous AS MATERIALIZED (
 SELECT *, (offer IS DISTINCT FROM $4::numeric OR offer_message IS DISTINCT FROM $8 OR offer_photos IS DISTINCT FROM $9::jsonb OR $11::boolean) AS seller_changed
 FROM submissions WHERE id=$1::uuid FOR UPDATE
), updated AS (
 UPDATE submissions s SET status=CASE WHEN p.status='Agreed' AND p.seller_changed AND $4::numeric IS NOT NULL THEN 'Offer ready' ELSE $2 END,internal_notes=$3,offer=$4::numeric,
 offer_message=$8,offer_photos=$9::jsonb,
 offer_version=p.offer_version+CASE WHEN p.seller_changed THEN 1 ELSE 0 END,
 edit_version=p.edit_version+1,updated_at=now()
 FROM previous p WHERE s.id=p.id AND p.offer_version=$5::integer
 AND ($12::integer IS NULL OR p.edit_version=$12::integer)
 AND NOT EXISTS (SELECT 1 FROM offer_emails e WHERE e.submission_id=s.id AND e.status='sending' AND e.locked_until>now())
 RETURNING s.*,p.seller_changed
), queued AS (
 INSERT INTO offer_emails(id,submission_id,version,amount,payload,purchase_snapshot)
 SELECT $6::uuid,id,offer_version,offer,$7::jsonb,$10::jsonb FROM updated
 WHERE offer IS NOT NULL AND seller_changed
 RETURNING id
)
SELECT id,offer,offer_version,edit_version,updated_at,status,internal_notes,offer_message,offer_photos,(SELECT id FROM queued) AS queued_email FROM updated`;

export const CLAIM_OFFER_SQL = `
UPDATE offer_emails e SET status='sending',first_attempt_at=coalesce(first_attempt_at,now()),
 locked_until=now()+interval '2 minutes',lease_id=$2::uuid,error=NULL
WHERE e.id=$1::uuid AND e.status IN ('pending','failed','sending')
 AND (e.locked_until IS NULL OR e.locked_until<now())
 AND (e.first_attempt_at IS NULL OR e.first_attempt_at>now()-interval '23 hours')
 AND EXISTS (SELECT 1 FROM submissions s WHERE s.id=e.submission_id AND s.offer_version=e.version AND s.offer=e.amount)
RETURNING e.*`;

export const OFFER_SUMMARY_SQL = `SELECT id,amount,provider_id,CASE WHEN status='sending' AND locked_until<now() THEN 'failed' ELSE status END AS status,sent_at,created_at,error,
 (purchase_snapshot IS NOT NULL) AS has_purchase_terms,accepted_at,accepted_name,
 (status IN ('pending','failed','sending') AND (locked_until IS NULL OR locked_until<now())
 AND (first_attempt_at IS NULL OR first_attempt_at>now()-interval '23 hours')
 AND version=(SELECT offer_version FROM submissions WHERE id=$1::uuid)) AS can_retry
 FROM offer_emails WHERE submission_id=$1::uuid ORDER BY version DESC LIMIT 1`;
