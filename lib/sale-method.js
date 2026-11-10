// Keep existing requests and drafts on the direct-purchase journey.
export const SALE_METHODS = ["direct", "consignment"];
export const saleMethodLabel = (method) =>
  method === "consignment" ? "Consignment" : "Sell directly";

export const CONSIGNMENT_STATUSES = [
  "New",
  "Reviewing",
  "Agreement sent",
  "Buyer offer sent",
  "Offer approved",
  "Agreed",
  "Awaiting cards",
  "Listed",
  "Sold",
  "Paid",
  "Closed",
];
export function saleMethodStatus(method, status) {
  if (method !== "consignment") return null;
  return (
    {
      New: "Consignment requested",
      Reviewing: "Consignment review",
      "Agreement sent": "Arrangement ready to review",
      "Buyer offer sent": "Buyer offer ready to review",
      "Offer approved": "Buyer offer approved",
      Agreed: "Consignment confirmed",
      "Awaiting cards": "Awaiting items",
      Listed: "Listed for sale",
      Sold: "Sold · awaiting payout",
      Paid: "Payment sent",
      Closed: "Closed",
    }[status] || "Consignment review"
  );
}

// Approval states come from saved records, not a manual status selection.
export const CONSIGNMENT_MANUAL_STATUSES = [
  "New",
  "Reviewing",
  "Awaiting cards",
  "Listed",
  "Sold",
  "Paid",
  "Closed",
];
export const canSetConsignmentStatus = (next, current) =>
  next === current || CONSIGNMENT_MANUAL_STATUSES.includes(next);
