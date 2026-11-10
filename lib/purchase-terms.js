import { BUSINESS, itemDetails } from "./site";
import {
  SLAB_INSPECTION_NOTICE,
  SLAB_INSPECTION_HOURS,
  STANDARD_INSPECTION_HOURS,
} from "./inspection-policy";

export const PURCHASE_TERMS = {
  version: "2026-11-09",
  sections: [
    {
      title: "Your items and our offer",
      text: "The listed offer is one total purchase price for the entire listed collection. You confirm that you own these items and are authorized to sell them. Items must be genuine and match the listed quantities, descriptions, condition, grading information and certification numbers. Products described as sealed must have their original, unopened seals.",
    },
    {
      title: "Shipping and insurance",
      text: "The seller pays shipping and insurance to our shop. Pack the items securely and keep your tracking and insurance records. Accept the offer and confirm shipping details with us before sending any items.",
    },
    {
      title: "Inspection",
      text: `${SLAB_INSPECTION_NOTICE} Collections containing slabs are inspected within 14 days of delivery. Collections containing only raw cards or sealed products are inspected within 72 hours of delivery. We check authenticity, quantity and condition against the accepted offer. The terms saved with an earlier offer continue to apply to that offer.`,
    },
    {
      title: "Payment",
      text: "When inspection confirms that the items match the accepted offer, we initiate payment the same day. Payment is made by ACH, wire, Zelle, Cash App or Venmo, as arranged with you. Transfer processing times may affect when funds become available. We confirm payment details directly; do not enter bank or payment-account details in the acceptance form.",
    },
    {
      title: "If items do not match",
      text: "We contact you about any differences before completing the purchase. A different purchase price requires your agreement to a revised offer. If we do not proceed with the purchase, the seller pays return shipping. We coordinate the return with you before dispatch.",
    },
    {
      title: "Your acceptance record",
      text: "We keep the listed items, total price, these terms, your entered name and the time of acceptance. A confirmation copy is emailed to you and the shop. You can save or print the accepted offer for your records. If you prefer to confirm the purchase another way, contact the shop before accepting online.",
    },
  ],
};

export const money = (amount) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));

export function purchaseSnapshot(submission, amount) {
  const total = Number(amount).toFixed(2);
  return {
    reference: submission.id.slice(0, 8).toUpperCase(),
    sellerName: submission.seller_name,
    buyer: {
      name: BUSINESS.name,
      address: BUSINESS.address,
      phone: BUSINESS.phone,
      email: BUSINESS.email,
    },
    amount: total,
    inspectionHours: submission.cards.some(
      (item) => !item.itemType || item.itemType === "Graded card",
    )
      ? SLAB_INSPECTION_HOURS
      : STANDARD_INSPECTION_HOURS,
    items: submission.cards.map((item) => ({
      name: item.name,
      details: itemDetails(item),
      quantity: item.quantity,
      cert: item.cert || "",
      condition: item.condition || "",
    })),
    message: submission.offer_message?.trim() || "",
    terms: structuredClone(PURCHASE_TERMS),
    statement: `I agree to the Purchase Terms and the ${money(total)} total offer for the listed collection. By entering my name and selecting Accept offer, I agree to record my acceptance electronically.`,
  };
}

export function purchaseRecordText(snapshot) {
  return [
    `${snapshot.buyer.name} / SellMySlabs`,
    `Submission reference: ${snapshot.reference}`,
    `Seller: ${snapshot.sellerName}`,
    `Total offer for the listed collection: ${money(snapshot.amount)}`,
    "",
    "Items:",
    ...snapshot.items.map(
      (item) =>
        `• ${item.name} — ${item.details} · Qty ${item.quantity}${item.cert ? ` · Cert ${item.cert}` : ""}${item.condition && !item.details.includes(item.condition) ? ` · ${item.condition}` : ""}`,
    ),
    ...(snapshot.message
      ? ["", "A note about your offer:", snapshot.message]
      : []),
    "",
    `Purchase Terms · version ${snapshot.terms.version}`,
    ...snapshot.terms.sections.flatMap(({ title, text }) => ["", title, text]),
    "",
    "Acceptance statement:",
    snapshot.statement,
  ].join("\n");
}
