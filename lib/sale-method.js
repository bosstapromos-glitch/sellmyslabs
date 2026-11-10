// Keep existing requests and drafts on the direct-purchase journey.
export const SALE_METHODS = ["direct", "consignment"];
export const saleMethodLabel = (method) =>
  method === "consignment" ? "Consignment" : "Sell directly";

export const CONSIGNMENT_STATUSES = [
  "New",
  "Reviewing",
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
      Agreed: "Consignment confirmed",
      "Awaiting cards": "Awaiting items",
      Listed: "Listed for sale",
      Sold: "Sold · awaiting payout",
      Paid: "Payment sent",
      Closed: "Closed",
    }[status] || "Consignment review"
  );
}
