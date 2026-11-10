import { z } from "zod";
import { BUSINESS, itemDetails } from "./site";
import {
  consignmentPayout,
  CONSIGNMENT_RATES,
  CONSIGNMENT_PAYMENT,
} from "./consignment";
import { SLAB_INSPECTION_NOTICE } from "./inspection-policy";

export const consignmentMoney = (cents) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export const consignmentPriceSchema = z
  .string()
  .trim()
  .regex(
    /^\d+(\.\d{1,2})?$/,
    "Enter a dollar amount with up to two decimal places.",
  )
  .refine((v) => Number(v) <= 100000000, "Enter a smaller amount.");
export const consignmentPublishSchema = z.object({
  id: z.string().uuid(),
  editVersion: z.number().int().min(0),
  kind: z.enum(["arrangement", "sale"]),
  message: z.string().trim().max(3000).default(""),
  channel: z.enum(["In store", "eBay"]).optional(),
  lines: z
    .array(
      z.object({
        itemIndex: z.number().int().min(0).max(49),
        quantity: z.number().int().min(1).max(10000),
        listingType: z.enum(["single", "lot", "sealed"]),
        salePrice: consignmentPriceSchema,
        marketplaceFees: consignmentPriceSchema,
      }),
    )
    .max(50)
    .default([]),
});
export const CONSIGNMENT_TERMS = {
  version: "consignment-2026-11-10-v1",
  title: "Consignment arrangement",
  sections: [
    {
      title: "Selling your items",
      text: "You authorize Lifestyle Cards & Collectibles / SellMySlabs to offer the listed items for sale in store and on eBay. Your asking prices are targets, not guaranteed sale prices or payouts. We send buyer offers to you for approval before accepting them. You confirm that you own the listed items and are authorized to consign them.",
    },
    {
      title: "Rates and fees",
      text: "The sale price of each single, lot or sealed-product listing determines its payout tier. We deduct actual marketplace/payment fees and the listing fee, then apply the seller payout percentage to the remainder. Listing fees are $0.99 per single, $2.99 per lot and $9.99 per sealed-product listing. Fees and seller payout shown with a buyer offer are estimates until the buyer’s payment and actual fees are confirmed.",
    },
    {
      title: "Delivery and inspection",
      text: `Confirm delivery arrangements with the shop before sending items. You pay shipping and insurance to the shop, and return shipping if items are returned. ${SLAB_INSPECTION_NOTICE} Items must be genuine and match the submitted descriptions, quantities and condition. We contact you about any differences before proceeding.`,
    },
    { title: "Payment", text: CONSIGNMENT_PAYMENT },
    {
      title: "Your record",
      text: "Your accepted items, rates, message, name and acceptance time are saved. A confirmation copy is emailed to you and the shop. Contact the shop to arrange any changes; accepting a buyer offer authorizes the described sale and does not mean buyer payment has already been received.",
    },
  ],
};
export function remainingConsignmentQuantities(cards, acceptedOffers) {
  const remaining = cards.map((c) => c.quantity);
  for (const record of acceptedOffers)
    if (record.kind === "sale" && record.accepted_at)
      for (const line of record.snapshot.lines || [])
        remaining[line.itemIndex] = Math.max(
          0,
          (remaining[line.itemIndex] || 0) - line.quantity,
        );
  return remaining;
}
export function consignmentSnapshot(
  submission,
  input,
  remaining = submission.cards.map((c) => c.quantity),
) {
  const data = consignmentPublishSchema.parse(input);
  if (submission.sale_method !== "consignment")
    throw Error("Choose a consignment request.");
  const base = {
    kind: data.kind,
    reference: submission.id.slice(0, 8).toUpperCase(),
    sellerName: submission.seller_name,
    shop: {
      name: BUSINESS.name,
      address: BUSINESS.address,
      email: BUSINESS.email,
      phone: BUSINESS.phone,
    },
    message: data.message,
    terms: structuredClone(CONSIGNMENT_TERMS),
    rates: CONSIGNMENT_RATES.map(({ label, percent }) => ({ label, percent })),
  };
  const item = (card, quantity) => ({
    name: card.name,
    details: itemDetails(card),
    quantity,
    cert: card.cert || "",
    asking: card.asking || "",
  });
  if (data.kind === "arrangement")
    return {
      ...base,
      items: submission.cards.map((c) => item(c, c.quantity)),
      statement:
        "I agree to this consignment arrangement for the listed items and authorize SellMySlabs to offer them for sale in store and on eBay, subject to my approval of buyer offers. By entering my name and selecting Accept arrangement, I record my acceptance electronically.",
    };
  if (!data.channel || !data.lines.length)
    throw Error("Choose a sales channel and at least one item.");
  const seen = new Set();
  const lines = data.lines.map((line) => {
    const card = submission.cards[line.itemIndex];
    if (!card || seen.has(line.itemIndex))
      throw Error("Choose each listed item once.");
    seen.add(line.itemIndex);
    if (line.quantity > remaining[line.itemIndex])
      throw Error(
        `The available quantity changed for ${card.name}. Reopen the request.`,
      );
    if (
      (card.itemType === "Sealed product") !==
      (line.listingType === "sealed")
    )
      throw Error(
        "Use the sealed-product listing fee for sealed products only.",
      );
    if (line.listingType === "single" && line.quantity !== 1)
      throw Error("Use a lot when multiple cards share one sale price.");
    const saleCents = Math.round(Number(line.salePrice) * 100),
      feeCents = Math.round(Number(line.marketplaceFees) * 100);
    const listingFeeCents = { single: 99, lot: 299, sealed: 999 }[
      line.listingType
    ];
    const payout = consignmentPayout(saleCents, feeCents, listingFeeCents);
    if (payout.sellerPayoutCents <= 0)
      throw Error(
        "Each listing must leave a positive seller payout after fees.",
      );
    return {
      ...item(card, line.quantity),
      itemIndex: line.itemIndex,
      listingType: line.listingType,
      saleCents,
      feeCents,
      listingFeeCents,
      ...payout,
    };
  });
  const total = (key) => lines.reduce((n, line) => n + line[key], 0);
  return {
    ...base,
    channel: data.channel,
    lines,
    items: lines,
    saleCents: total("saleCents"),
    sellerPayoutCents: total("sellerPayoutCents"),
    statement: `I approve the listed ${data.channel} buyer offer of ${consignmentMoney(total("saleCents"))} for these items. I understand my estimated payout is ${consignmentMoney(total("sellerPayoutCents"))}, with the final payout calculated using actual fees and the saved payout rates. By entering my name and selecting Accept buyer offer, I authorize this sale and record my acceptance electronically.`,
  };
}
export function consignmentRecordText(s) {
  return [
    s.kind === "arrangement"
      ? "Consignment arrangement"
      : "Consignment buyer offer",
    `Reference: ${s.reference}`,
    `Seller: ${s.sellerName}`,
    `Shop: ${s.shop.name}`,
    "",
    ...s.items.map(
      (i) =>
        `• ${i.name} — ${i.details} · Qty ${i.quantity}${i.cert ? ` · Cert ${i.cert}` : ""}${s.kind === "arrangement" && i.asking ? ` · Target ${i.asking} each` : ""}`,
    ),
    ...(s.kind === "sale"
      ? [
          "",
          `Channel: ${s.channel}`,
          ...s.lines.map(
            (l) =>
              `${l.name}: sale ${consignmentMoney(l.saleCents)} − estimated marketplace/payment fees ${consignmentMoney(l.feeCents)} − listing fee ${consignmentMoney(l.listingFeeCents)}; seller rate ${l.percent}%; estimated payout ${consignmentMoney(l.sellerPayoutCents)}.`,
          ),
          `Estimated total seller payout: ${consignmentMoney(s.sellerPayoutCents)}`,
        ]
      : ["", ...s.rates.map((r) => `${r.label}: ${r.percent}% after fees`)]),
    ...(s.message ? ["", "Shop note:", s.message] : []),
    "",
    `${s.terms.title} · ${s.terms.version}`,
    ...s.terms.sections.flatMap((t) => [t.title, t.text]),
    "",
    s.statement,
  ].join("\n");
}
