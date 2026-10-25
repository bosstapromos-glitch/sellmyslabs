// Accept familiar USD formatting without guessing at malformed separators.
export function normalizeOfferPrice(value) {
  const text = value.trim();
  if (!text) return "";
  if (!/^\$?\s*(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text)) return null;
  const amount = text.replace(/^\$?\s*/, "").replaceAll(",", "");
  if (Number(amount) <= 0 || Number(amount) > 999999999999.99) return null;
  return amount;
}

export const OFFER_PRICE_ERROR = "Enter a price greater than zero, such as $80.00 or $1,200, or leave it blank.";
