import { normalizeOfferPrice } from "./offer-price";

export function hasSellerContextEdits(
  selected,
  { sellerMessage, offerPhotos, newOfferPhotos = [] },
) {
  if (!selected) return false;
  return (
    (sellerMessage !== undefined &&
      sellerMessage.trim() !== (selected.offer_message || "")) ||
    newOfferPhotos.length > 0 ||
    (offerPhotos !== undefined &&
      JSON.stringify(offerPhotos.map((photo) => photo.id)) !==
        JSON.stringify((selected.offer_photos || []).map((photo) => photo.id)))
  );
}

export function hasOwnerEdits(selected, { offer, notes, status, ...context }) {
  if (!selected) return false;
  const normalized = normalizeOfferPrice(String(offer));
  const samePrice =
    normalized !== null &&
    (normalized === ""
      ? selected.offer == null || selected.offer === ""
      : selected.offer != null &&
        Number(normalized) === Number(selected.offer));
  return (
    !samePrice ||
    notes !== selected.internal_notes ||
    status !== selected.status ||
    hasSellerContextEdits(selected, context)
  );
}
