// The submission lock and edit version serialize publication, acceptance and owner edits.
export const PUBLISH_CONSIGNMENT_SQL = `
WITH current AS MATERIALIZED (
 SELECT * FROM submissions WHERE id=$1::uuid AND sale_method='consignment'
 AND edit_version=$2::integer AND status NOT IN ('Closed','Paid') FOR UPDATE
), added AS (
 INSERT INTO consignment_offers(id,submission_id,kind,snapshot,arrangement_id)
 SELECT $3::uuid,id,$4,$5::jsonb,CASE WHEN $4='sale' THEN consignment_arrangement_id ELSE NULL END FROM current
 WHERE $4='arrangement' OR EXISTS(SELECT 1 FROM consignment_offers a WHERE a.id=current.consignment_arrangement_id AND a.accepted_at IS NOT NULL)
 RETURNING *
), withdrawn AS (
 UPDATE consignment_offers o SET withdrawn_at=now() FROM added a
 WHERE o.submission_id=a.submission_id AND o.id<>a.id AND o.accepted_at IS NULL AND o.withdrawn_at IS NULL
 AND (o.kind=a.kind OR a.kind='arrangement') RETURNING o.id
), marked AS (
 UPDATE submissions s SET consignment_arrangement_id=CASE WHEN a.kind='arrangement' THEN a.id ELSE s.consignment_arrangement_id END,
 consignment_offer_id=CASE WHEN a.kind='sale' THEN a.id ELSE NULL END,
 status=CASE WHEN a.kind='arrangement' THEN 'Agreement sent' ELSE 'Buyer offer sent' END,
 edit_version=s.edit_version+1,updated_at=now() FROM added a WHERE s.id=a.submission_id RETURNING s.edit_version,s.status
), queued AS (
 INSERT INTO consignment_emails(id,offer_id,kind,payload) SELECT $6::uuid,id,'offer',$7::jsonb FROM added RETURNING id
)
SELECT a.*,m.edit_version,m.status,(SELECT id FROM queued) AS email_id FROM added a CROSS JOIN marked m`;

export const CONSIGNMENT_OFFER_SQL = `
SELECT o.*, s.email, (CASE WHEN o.kind='arrangement' THEN s.consignment_arrangement_id ELSE s.consignment_offer_id END=o.id) AS is_current,
 (o.withdrawn_at IS NULL AND o.accepted_at IS NULL AND s.status NOT IN ('Closed','Paid') AND
 CASE WHEN o.kind='arrangement' THEN s.consignment_arrangement_id=o.id ELSE s.consignment_offer_id=o.id AND s.consignment_arrangement_id=o.arrangement_id END) AS can_accept,
 (SELECT status FROM consignment_emails WHERE offer_id=o.id AND kind='acceptance') AS receipt_status
FROM consignment_offers o JOIN submissions s ON s.id=o.submission_id WHERE o.id=$1::uuid`;

export const ACCEPT_CONSIGNMENT_SQL = `
WITH current AS MATERIALIZED (
 SELECT s.* FROM submissions s JOIN consignment_offers o ON o.submission_id=s.id WHERE o.id=$1::uuid FOR UPDATE OF s
), accepted AS (
 UPDATE consignment_offers o SET accepted_at=$3::timestamptz,accepted_name=$2 FROM current s
 WHERE o.id=$1::uuid AND o.submission_id=s.id AND o.accepted_at IS NULL AND o.withdrawn_at IS NULL
 AND s.status NOT IN ('Closed','Paid') AND
 CASE WHEN o.kind='arrangement' THEN s.consignment_arrangement_id=o.id ELSE s.consignment_offer_id=o.id AND s.consignment_arrangement_id=o.arrangement_id END
 RETURNING o.*
), marked AS (
 UPDATE submissions s SET status=CASE WHEN a.kind='arrangement' THEN 'Agreed' ELSE 'Offer approved' END,
 edit_version=s.edit_version+1,updated_at=now() FROM accepted a WHERE s.id=a.submission_id RETURNING s.id
), receipt AS (
 INSERT INTO consignment_emails(id,offer_id,kind,payload) SELECT $4::uuid,id,'acceptance',$5::jsonb FROM accepted
 ON CONFLICT(offer_id,kind) DO NOTHING RETURNING id
)
SELECT a.*,(SELECT id FROM receipt) AS email_id FROM accepted a`;

export const CLAIM_CONSIGNMENT_EMAIL_SQL = `
UPDATE consignment_emails e SET status='sending',first_attempt_at=coalesce(first_attempt_at,now()),locked_until=now()+interval '2 minutes',lease_id=$2::uuid,error=NULL
WHERE e.id=$1::uuid AND e.status IN ('pending','failed','sending') AND (e.locked_until IS NULL OR e.locked_until<now())
 AND (e.first_attempt_at IS NULL OR e.first_attempt_at>now()-interval '23 hours')
 AND (e.kind='acceptance' OR EXISTS(SELECT 1 FROM consignment_offers o JOIN submissions s ON s.id=o.submission_id
 WHERE o.id=e.offer_id AND o.withdrawn_at IS NULL AND s.status NOT IN ('Closed','Paid') AND
 CASE WHEN o.kind='arrangement' THEN s.consignment_arrangement_id=o.id ELSE s.consignment_offer_id=o.id END)) RETURNING e.*`;

export function publicConsignmentOffer(row) {
  return row
    ? {
        id: row.id,
        snapshot: row.snapshot,
        acceptedAt: row.accepted_at,
        acceptedName: row.accepted_name,
        isCurrent: row.is_current,
        canAccept: !!row.can_accept,
        receiptSent: row.receipt_status === "sent",
      }
    : null;
}

// Skip replaced/closed notification emails so they cannot block newer retries.
export const PENDING_CONSIGNMENT_EMAILS_SQL = `
SELECT e.id FROM consignment_emails e
WHERE e.status IN ('pending','failed','sending') AND (e.locked_until IS NULL OR e.locked_until<now())
 AND (e.first_attempt_at IS NULL OR e.first_attempt_at>now()-interval '23 hours')
 AND (e.kind='acceptance' OR EXISTS(SELECT 1 FROM consignment_offers o JOIN submissions s ON s.id=o.submission_id
 WHERE o.id=e.offer_id AND o.withdrawn_at IS NULL AND s.status NOT IN ('Closed','Paid') AND
 CASE WHEN o.kind='arrangement' THEN s.consignment_arrangement_id=o.id ELSE s.consignment_offer_id=o.id END))
ORDER BY e.created_at LIMIT 3`;
