export const ITEM_TYPES = ["Graded card", "Raw card", "Sealed product"];
export function itemDetails(item) {
  const type = item.itemType || "Graded card";
  return type === "Graded card"
    ? `${item.grader} ${item.grade}`
    : `${type}${item.condition ? ` · ${item.condition}` : ""}`;
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
    "Can I consign instead of selling directly?",
    "Yes. Choose Consign with us on the request form. We review graded cards, raw cards and sealed products for in-store and eBay sales. Enter your target price for each item; you can accept your consignment arrangement and buyer offers in your account. Payout follows receipt of the buyer’s payment, with fees deducted from sale proceeds. Review the consignment page for payout tiers and listing fees.",
  ],
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
    "How do direct-purchase shipping and payment work?",
    "The seller pays shipping and insurance. Due to extreme demand, allow 1–2 weeks after delivery for inspection of collections containing slabs. Collections containing only raw cards or sealed products are inspected within 72 hours. We initiate payment the same day inspection confirms the items match. Review the Purchase Terms in your offer link, accept the offer and confirm shipping details with us before sending items.",
  ],
  [
    "Who is behind SellMySlabs?",
    "SellMySlabs is operated by Lifestyle Cards & Collectibles, a trading card shop in Twin Falls, Idaho. You can find our store, contact details and customer reviews on Google.",
  ],
];
