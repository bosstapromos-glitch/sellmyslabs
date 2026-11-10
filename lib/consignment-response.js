import { z } from "zod";
import { consignmentPriceSchema, consignmentMoney } from "./consignment-offer";
import { consignmentPayout } from "./consignment";
export const consignmentResponseSchema = z.object({
  action: z.enum(["decline", "counter", "changes"]),
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(150)
    .refine(
      (v) => !/[\u0000-\u001f\u007f]/.test(v),
      "Enter your name on one line.",
    ),
  termsVersion: z.string().max(64),
  note: z
    .string()
    .trim()
    .max(2000, "Keep your note under 2,000 characters.")
    .default(""),
  prices: z
    .array(
      z.object({
        itemIndex: z.number().int().min(0).max(49),
        salePrice: consignmentPriceSchema,
      }),
    )
    .max(50)
    .default([]),
});
export const responseLabel = (action) =>
  ({
    decline: "Declined",
    counter: "Counteroffer sent",
    changes: "Changes requested",
  })[action] || "Response saved";
export function buildConsignmentResponse(snapshot, data) {
  const base = { action: data.action, note: data.note || "" };
  if (data.action === "decline") return base;
  if (data.action === "changes") {
    if (snapshot.kind !== "arrangement")
      throw Error("Use a counteroffer to request changes to a buyer offer.");
    if (!base.note.trim())
      throw Error("Tell the shop what you’d like to change.");
    return base;
  }
  if (data.action !== "counter" || snapshot.kind !== "sale")
    throw Error("Counteroffers are available for buyer offers only.");
  if (
    data.prices.length !== snapshot.lines.length ||
    new Set(data.prices.map((p) => p.itemIndex)).size !== snapshot.lines.length
  )
    throw Error("Enter a proposed sale price for each listing in this offer.");
  let changed = false;
  const lines = snapshot.lines.map((line) => {
    const proposed = data.prices.find((p) => p.itemIndex === line.itemIndex);
    if (!proposed) throw Error("Use only the items included in this offer.");
    const saleCents = Math.round(
      Number(consignmentPriceSchema.parse(proposed.salePrice)) * 100,
    );
    const payout = consignmentPayout(
      saleCents,
      line.feeCents,
      line.listingFeeCents,
    );
    if (payout.sellerPayoutCents <= 0)
      throw Error(
        "The sale price must leave a positive payout after the displayed fees.",
      );
    if (saleCents !== line.saleCents) changed = true;
    return { ...line, saleCents, ...payout };
  });
  if (!changed)
    throw Error("Change at least one sale price to send a counteroffer.");
  return {
    ...base,
    lines,
    saleCents: lines.reduce((n, l) => n + l.saleCents, 0),
    sellerPayoutCents: lines.reduce((n, l) => n + l.sellerPayoutCents, 0),
  };
}
export function consignmentResponseText(response) {
  return [
    responseLabel(response.action),
    ...(response.lines
      ? response.lines.map(
          (l) =>
            `${l.name} · Qty ${l.quantity}: proposed sale price ${consignmentMoney(l.saleCents)}; estimated seller payout ${consignmentMoney(l.sellerPayoutCents)} using the previously displayed fees.`,
        )
      : []),
    ...(response.note ? ["Seller note:", response.note] : []),
    "This is a response to the saved offer, not an acceptance. The shop can send a revised version for review.",
  ].join("\n");
}
