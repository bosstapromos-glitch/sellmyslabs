// A photo can belong to one item, as its front or its back. Photos without a
// label are general photos: group shots, sealed product, extra angles.
// Items are identified by their position in the request's item list.
export const PHOTO_SIDES = ["front", "back"];
const MAX_ITEMS = 50;
const NONE = { item: null, side: null };

export function cleanLabel(value, itemCount = MAX_ITEMS) {
  const item = value?.item;
  return Number.isInteger(item) &&
    item >= 0 &&
    item < Math.min(itemCount, MAX_ITEMS) &&
    PHOTO_SIDES.includes(value.side)
    ? { item, side: value.side }
    : NONE;
}

export const labelsOf = (photos, itemCount) =>
  photos.map((photo) => cleanLabel(photo, itemCount));

export function labelText(photo) {
  const { item, side } = cleanLabel(photo);
  return item === null
    ? ""
    : `Item ${item + 1} · ${side === "front" ? "Front" : "Back"}`;
}

export const slotPhoto = (photos, item, side) =>
  photos.find((photo) => photo.item === item && photo.side === side);

// Graded cards need both sides: the label and cert number on the front, the
// case and card back for condition. Returns [{ index, sides }] for each
// graded card that is missing one.
export function missingItemPhotos(cards, photos) {
  const missing = [];
  cards.forEach((card, index) => {
    if ((card.itemType || "Graded card") !== "Graded card") return;
    const sides = PHOTO_SIDES.filter((side) => !slotPhoto(photos, index, side));
    if (sides.length) missing.push({ index, sides });
  });
  return missing;
}

export function missingPhotosMessage(sides) {
  return sides.length === 2
    ? "Add a front and a back photo of this card."
    : `Add a photo of the ${sides[0]} of this card.`;
}

// When an item is removed, its photos become general photos and the photos
// of later items follow their items up the list.
export function relabelAfterRemoval(photos, removed) {
  return photos.map((photo) => {
    if (!Number.isInteger(photo.item)) return photo;
    if (photo.item === removed) return { ...photo, ...NONE };
    return photo.item > removed ? { ...photo, item: photo.item - 1 } : photo;
  });
}

export const unlabelAll = (photos) =>
  photos.map((photo) =>
    Number.isInteger(photo.item) ? { ...photo, ...NONE } : photo,
  );
