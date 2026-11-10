import { z } from "zod";
import { normalizeOfferPrice } from "./offer-price";
export const PURCHASE_RESPONSE_STATUSES = [
  "Counter received",
  "Seller declined",
];
export const purchaseResponseLabel = (action) =>
  action === "counter" ? "Counteroffer sent" : "Declined";
export const purchaseResponseSchema = z.object({
  action: z.enum(["decline", "counter"]),
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(150)
    .refine(
      (v) => !/[\u0000-\u001f\u007f]/.test(v),
      "Enter your name on one line.",
    ),
  termsVersion: z.string().max(40),
  note: z
    .string()
    .trim()
    .max(2000, "Keep your note under 2,000 characters.")
    .default(""),
  amount: z.string().trim().max(20).default(""),
});
export function purchaseResponse(snapshot, data) {
  let amount = null;
  if (data.action === "counter") {
    const normalized = normalizeOfferPrice(data.amount);
    if (!normalized)
      throw Error(
        "Enter a total counteroffer greater than zero, such as $120.00.",
      );
    amount = Number(normalized).toFixed(2);
    if (amount === Number(snapshot.amount).toFixed(2))
      throw Error("Enter a different total to send a counteroffer.");
  }
  return { action: data.action, amount, note: data.note };
}
export function samePurchaseResponse(row, name, response) {
  return (
    !!row?.responded_at &&
    row.response_name === name &&
    row.response?.action === response.action &&
    row.response?.amount === response.amount &&
    row.response?.note === response.note
  );
}
export function canSetPurchaseResponseStatus(next, current) {
  return !PURCHASE_RESPONSE_STATUSES.includes(next) || next === current;
}
