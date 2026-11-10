import { saleMethodStatus } from "./sale-method";
export const CLAIM_CUSTOMER_REQUESTS_SQL = `
UPDATE submissions SET customer_user_id=$1
WHERE customer_user_id IS NULL AND lower(btrim(email))=ANY($2::text[])`;

const FIELDS = `s.id,s.created_at,s.seller_name,s.email,s.phone,s.seller_notes,s.cards,s.photos,s.asking_total,s.status,s.sale_method,
 e.id AS offer_id,e.amount AS offer_amount,e.sent_at AS offer_sent_at,e.accepted_at,
 (e.purchase_snapshot IS NOT NULL) AS has_agreement,
 p.shipped_at,p.received_at,p.inspected_at,p.inspected_offer_id,p.paid_at,p.paid_offer_id`;
const JOINS = `FROM submissions s
 LEFT JOIN offer_emails e ON e.submission_id=s.id AND e.version=s.offer_version AND e.amount=s.offer AND e.status='sent'
 LEFT JOIN purchase_shipments p ON p.submission_id=s.id`;
export const CUSTOMER_REQUESTS_SQL = `SELECT ${FIELDS} ${JOINS}
 WHERE s.customer_user_id=$1 ORDER BY s.created_at DESC,s.id DESC LIMIT 21 OFFSET $2::integer`;
export const CUSTOMER_REQUEST_SQL = `SELECT ${FIELDS} ${JOINS}
 WHERE s.customer_user_id=$1 AND s.id=$2::uuid`;
export const CUSTOMER_PHOTOS_SQL = `SELECT photos FROM submissions WHERE customer_user_id=$1 AND id=$2::uuid`;
export const validRequestId = (value) =>
  typeof value === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
const date = (value) => (value ? new Date(value).toISOString() : null);
export function customerStage(row) {
  if (row.sale_method === "consignment")
    return saleMethodStatus(row.sale_method, row.status);
  if (row.status === "Closed") return "Closed";
  if (row.offer_id && row.paid_at && row.paid_offer_id === row.offer_id)
    return "Payment sent";
  if (row.status === "Paid") return "Paid";
  if (row.accepted_at) {
    if (row.inspected_at && row.inspected_offer_id === row.offer_id)
      return "Inspection complete";
    if (row.received_at) return "In inspection";
    if (row.shipped_at) return "Shipped";
    return "Offer accepted";
  }
  if (row.offer_id) return "Offer ready";
  return row.status === "New" ? "Submitted" : "In review";
}
export function customerRequest(row) {
  if (!row) return null;
  const cards = (Array.isArray(row.cards) ? row.cards : []).map((card) => ({
    name: card.name || "Item",
    itemType: card.itemType || "Graded card",
    category: card.category || "",
    quantity: Number(card.quantity) || 1,
    grader: card.grader || "",
    grade: card.grade || "",
    cert: card.cert || "",
    condition: card.condition || "",
    asking: card.asking || "",
  }));
  return {
    id: row.id,
    saleMethod: row.sale_method || "direct",
    reference: row.id.slice(0, 8).toUpperCase(),
    createdAt: date(row.created_at),
    name: row.seller_name,
    email: row.email,
    phone: row.phone || "",
    notes: row.seller_notes || "",
    askingTotal: row.asking_total ? Number(row.asking_total) : null,
    cards,
    itemCount: cards.reduce((total, item) => total + item.quantity, 0),
    photoCount: Array.isArray(row.photos) ? row.photos.length : 0,
    stage: customerStage(row),
    closed: row.status === "Closed",
    offer: row.offer_id
      ? {
          id: row.offer_id,
          amount: Number(row.offer_amount),
          sentAt: date(row.offer_sent_at),
          acceptedAt: date(row.accepted_at),
          hasAgreement: !!row.has_agreement,
        }
      : null,
  };
}
