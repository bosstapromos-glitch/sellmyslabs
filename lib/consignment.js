export const CONSIGNMENT_RATES = [
  { min: 99, max: 999, percent: 80, label: "$0.99–$9.99" },
  { min: 1000, max: 2499, percent: 82, label: "$10–$24.99" },
  { min: 2500, max: 49999, percent: 87, label: "$25–$499.99" },
  { min: 50000, max: 99999, percent: 90, label: "$500–$999.99" },
  { min: 100000, max: 499999, percent: 96, label: "$1,000–$4,999.99" },
  { min: 500000, max: Infinity, percent: 97, label: "$5,000+" },
];
export const CONSIGNMENT_PAYMENT =
  "We initiate your payout immediately after we receive the buyer’s payment. Transfer processing times depend on the payment method.";
export const CONSIGNMENT_APPROVAL =
  "Add an asking price for each item. We’ll aim for your target and send buyer offers to your SellMySlabs account for approval before accepting them.";
export function consignmentRate(saleCents) {
  if (!Number.isSafeInteger(saleCents)) return null;
  return (
    CONSIGNMENT_RATES.find(
      (tier) => saleCents >= tier.min && saleCents <= tier.max,
    )?.percent ?? null
  );
}

// Tier uses the item sale price; the percentage applies after all sale fees.
export function consignmentPayout(
  saleCents,
  marketplaceFeeCents,
  listingFeeCents,
) {
  const percent = consignmentRate(saleCents);
  if (
    percent === null ||
    ![marketplaceFeeCents, listingFeeCents].every(
      (n) => Number.isSafeInteger(n) && n >= 0,
    )
  )
    throw new Error("Enter a valid sale price and fees in cents.");
  const net =
    BigInt(saleCents) - BigInt(marketplaceFeeCents) - BigInt(listingFeeCents);
  if (net < 0n) throw new Error("Fees cannot exceed the sale price.");
  const payout = Number((net * BigInt(percent) + 50n) / 100n);
  return {
    percent,
    netSaleCents: Number(net),
    sellerPayoutCents: payout,
    shopShareCents: Number(net) - payout,
  };
}
