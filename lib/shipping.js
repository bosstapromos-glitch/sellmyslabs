import { z } from "zod";
import { inspectionHours } from "./inspection-policy";

export const CARRIERS = ["USPS", "UPS", "FedEx"];
export const trackingSchema = z.object({
  carrier: z.enum(CARRIERS, { error: "Choose USPS, UPS or FedEx." }),
  tracking: z
    .string()
    .trim()
    .max(80)
    .transform((value) => value.replace(/[\s-]/g, "").toUpperCase())
    .pipe(
      z
        .string()
        .regex(
          /^[A-Z0-9]{8,40}$/,
          "Enter the tracking number from your shipping receipt.",
        ),
    ),
  version: z.number().int().min(0),
});
export function trackingUrl(carrier, tracking) {
  const parsed = trackingSchema.safeParse({ carrier, tracking, version: 0 });
  if (!parsed.success) return null;
  const number = encodeURIComponent(parsed.data.tracking);
  return carrier === "USPS"
    ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${number}`
    : carrier === "UPS"
      ? `https://www.ups.com/track?tracknum=${number}`
      : `https://www.fedex.com/fedextrack/?trknbr=${number}`;
}
export function journeyTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Boise",
  }).format(new Date(value));
}
export function publicShipment(row) {
  if (!row) return null;
  const inspected = row.inspected_offer_id === row.offer_id;
  const paid = row.paid_offer_id === row.offer_id;
  const date = (value) => (value ? new Date(value).toISOString() : null);
  return {
    version: row.shipping_version ?? 0,
    carrier: row.carrier || "",
    tracking: row.tracking || "",
    trackingUrl: trackingUrl(row.carrier, row.tracking),
    shippedAt: date(row.shipped_at),
    receivedAt: date(row.received_at),
    inspectionHours: inspectionHours(row.inspection_hours),
    inspectedAt: inspected ? date(row.inspected_at) : null,
    paidAt: paid ? date(row.paid_at) : null,
    acceptedAt: date(row.accepted_at),
    isCurrent: row.is_current,
    closed: row.request_status === "Closed",
    canEdit: !!(
      row.accepted_at &&
      row.is_current &&
      !row.received_at &&
      !["Closed", "Paid"].includes(row.request_status)
    ),
    canProgress: !!(
      row.accepted_at &&
      row.is_current &&
      row.request_status !== "Closed" &&
      !(paid && row.paid_at)
    ),
  };
}

export const SHIPMENT_SQL = `
SELECT e.id AS offer_id,e.accepted_at,s.status AS request_status,
 e.purchase_snapshot->>'inspectionHours' AS inspection_hours,
 (e.version=s.offer_version AND e.amount=s.offer) AS is_current,
 p.version AS shipping_version,p.carrier,p.tracking,p.shipped_at,p.received_at,
 p.inspected_at,p.inspected_offer_id,p.paid_at,p.paid_offer_id
FROM offer_emails e JOIN submissions s ON s.id=e.submission_id
LEFT JOIN purchase_shipments p ON p.submission_id=s.id
WHERE e.id=$1::uuid AND e.purchase_snapshot IS NOT NULL`;

// Lock the same submission row used by offer saves and acceptance. A revised
// offer, closed request, received parcel or stale tab cannot replace tracking.
export const SAVE_TRACKING_SQL = `
WITH current AS MATERIALIZED (
 SELECT s.id FROM submissions s JOIN offer_emails e ON e.submission_id=s.id
 WHERE e.id=$1::uuid AND e.accepted_at IS NOT NULL AND e.purchase_snapshot IS NOT NULL
 AND e.version=s.offer_version AND e.amount=s.offer AND s.status NOT IN ('Closed','Paid')
 FOR UPDATE OF s
)
INSERT INTO purchase_shipments(submission_id,carrier,tracking,shipped_at,version)
SELECT id,$2,$3,now(),1 FROM current
WHERE $4::integer=0 OR EXISTS(SELECT 1 FROM purchase_shipments p WHERE p.submission_id=current.id)
ON CONFLICT(submission_id) DO UPDATE SET carrier=excluded.carrier,tracking=excluded.tracking,
 shipped_at=coalesce(purchase_shipments.shipped_at,excluded.shipped_at),version=purchase_shipments.version+1
WHERE purchase_shipments.version=$4::integer AND purchase_shipments.received_at IS NULL
RETURNING submission_id`;

// Inspection and payment belong to the accepted offer version; receipt belongs
// to the physical collection and survives a negotiated replacement offer.
export const SAVE_PROGRESS_SQL = `
WITH current AS MATERIALIZED (
 SELECT s.id,s.edit_version,p.version AS shipping_version,p.received_at,p.inspected_at,p.inspected_offer_id,p.paid_at,p.paid_offer_id
 FROM submissions s JOIN offer_emails e ON e.submission_id=s.id
 LEFT JOIN purchase_shipments p ON p.submission_id=s.id
 WHERE e.id=$1::uuid AND e.accepted_at IS NOT NULL AND e.version=s.offer_version AND e.amount=s.offer
 AND s.status<>'Closed' AND s.edit_version=$5::integer FOR UPDATE OF s
), changed AS (
 INSERT INTO purchase_shipments(submission_id,received_at,inspected_at,inspected_offer_id,paid_at,paid_offer_id,version)
 SELECT id,CASE WHEN $2='received' THEN $4::timestamptz ELSE received_at END,
 CASE WHEN $2='inspected' THEN $4::timestamptz ELSE inspected_at END,
 CASE WHEN $2='inspected' THEN $1::uuid ELSE inspected_offer_id END,
 CASE WHEN $2='paid' THEN $4::timestamptz ELSE paid_at END,
 CASE WHEN $2='paid' THEN $1::uuid ELSE paid_offer_id END,coalesce(shipping_version,0)+1
 FROM current WHERE coalesce(shipping_version,0)=$3::integer
 AND NOT (paid_offer_id IS NOT DISTINCT FROM $1::uuid AND paid_at IS NOT NULL)
 AND (($2='received' AND received_at IS NULL)
 OR ($2='inspected' AND received_at IS NOT NULL AND $4::timestamptz>=received_at AND (inspected_offer_id IS DISTINCT FROM $1::uuid OR inspected_at IS NULL))
 OR ($2='paid' AND inspected_offer_id=$1::uuid AND inspected_at IS NOT NULL AND $4::timestamptz>=inspected_at AND (paid_offer_id IS DISTINCT FROM $1::uuid OR paid_at IS NULL)))
 ON CONFLICT(submission_id) DO UPDATE SET received_at=excluded.received_at,inspected_at=excluded.inspected_at,
 inspected_offer_id=excluded.inspected_offer_id,paid_at=excluded.paid_at,paid_offer_id=excluded.paid_offer_id,version=excluded.version
 WHERE purchase_shipments.version=$3::integer
 RETURNING submission_id
), marked AS (
 UPDATE submissions s SET status=CASE WHEN $2='paid' THEN 'Paid' ELSE s.status END,edit_version=s.edit_version+1,updated_at=now()
 FROM changed c WHERE s.id=c.submission_id RETURNING s.id,s.edit_version,s.status
)
SELECT c.*,m.edit_version,m.status FROM changed c JOIN marked m ON m.id=c.submission_id`;
