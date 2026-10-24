export const ITEM_TYPES = ["Graded card", "Raw card", "Sealed product"];
export function itemDetails(item) {
  const type = item.itemType || "Graded card";
  return type === "Graded card" ? `${item.grader} ${item.grade}` : `${type}${item.condition ? ` · ${item.condition}` : ""}`;
}
export const GRADERS = ["PSA", "CGC", "BGS", "TAG"];
export const CATEGORIES = [
  "Pokémon",
  "Football",
  "Baseball",
  "Basketball",
  "Hockey",
  "Soccer",
  "One Piece",
];
export const BUSINESS = {
  name: "Lifestyle Cards & Collectibles",
  phone: "(208) 613-5529",
  phoneHref: "tel:+12086135529",
  email: "lifestylecardandcollectibles@gmail.com",
  address: "1339 Filer Ave E, Unit B, Twin Falls, ID 83301",
  google: "https://share.google/e0YnqDkZi036YkURF",
};
export const FAQS = [
  [
    "What can I sell?",
    "We buy graded cards, raw (ungraded) cards and sealed products, including Pokémon, sports cards and One Piece. For graded cards, we accept PSA, CGC, BGS and TAG. Tell us the set, quantity and condition so we can review your items.",
  ],
  [
    "Will every item receive an offer?",
    "Offers depend on the item, its condition, current market conditions and our buying needs. A request does not guarantee an offer or purchase.",
  ],
  [
    "When will I hear back?",
    "Our team typically responds within 24 hours with an offer or an update. Some collections may need more time to review.",
  ],
  [
    "Do I need to know what my cards are worth?",
    "No. You can add a total asking price for your collection, individual item prices, or leave both blank. Share the item details and our team will review them.",
  ],
  [
    "How do shipping and payment work?",
    "Before sending any items, agree the offer, shipping costs, insurance, inspection terms, payment method and payment timing with our team. Please do not ship until those details are confirmed.",
  ],
  [
    "Who is behind SellMySlabs?",
    "SellMySlabs is operated by Lifestyle Cards & Collectibles, a trading card shop in Twin Falls, Idaho. You can find our store, contact details and customer reviews on Google.",
  ],
];
