import { CONSIGNMENT_RATES } from "./consignment";

// Public "what we buy" guides. Every statement here must match the purchase
// terms, the inspection policy and the request form; update them together.
const PAYOUT_RANGE = `${Math.min(...CONSIGNMENT_RATES.map((t) => t.percent))}% to ${Math.max(...CONSIGNMENT_RATES.map((t) => t.percent))}%`;
const SHARED_PROCESS = {
  heading: "How selling works",
  steps: [
    "Send one request with your item details and photos. There is no obligation to sell.",
    "Our team reviews it and typically replies within 24 hours with an offer or an update.",
    "If the offer works for you, accept it and confirm shipping details with us before sending anything.",
    "We inspect the items after delivery and initiate payment the same day inspection confirms they match.",
  ],
};

export const SELL_GUIDES = [
  {
    slug: "sell-graded-cards",
    label: "Graded cards",
    blurb: "PSA, CGC, BGS and TAG slabs.",
    title: "Sell Graded Cards: PSA, CGC, BGS & TAG Slabs",
    description:
      "Sell PSA, CGC, BGS and TAG graded cards to Lifestyle Cards & Collectibles. Send the grade and photos, and get a personal offer from our Twin Falls, Idaho shop.",
    eyebrow: "GRADED CARDS",
    heading: "Sell your graded cards and slabs.",
    lead: "We buy PSA, CGC, BGS and TAG graded cards, from single slabs to full collections. Tell us what you have and our team will review it for a personal offer.",
    sections: [
      {
        heading: "Grading companies we accept",
        graderLogos: true,
        text: [
          "We review graded cards from PSA, CGC, BGS and TAG. Pokémon, sports cards and One Piece slabs are all welcome.",
          "Have something graded by another company? Call or email the shop before you submit and we’ll tell you whether we can review it.",
        ],
      },
      {
        heading: "What to send us",
        list: [
          "Card name, set and card number.",
          "Grading company and grade.",
          "Certification number, if you have it. It’s optional, and it helps us review faster.",
          "Clear photos of the front and back of each slab.",
          "An asking price for an item or the whole collection, if you have one in mind.",
        ],
      },
      {
        heading: "Inspection time for slabs",
        text: [
          "Collections containing slabs are inspected within 14 days of delivery to our shop. Due to extreme demand, please allow 1–2 weeks. We check authenticity, quantity and condition against the accepted offer, and initiate payment the same day inspection confirms the items match.",
        ],
      },
    ],
    faqs: [
      [
        "Which graded cards do you buy?",
        "We accept cards graded by PSA, CGC, BGS and TAG, including Pokémon, sports cards and One Piece.",
      ],
      [
        "Do I need the certification number?",
        "No. The certification number is optional on the request form. Including it helps our team review your slab.",
      ],
      [
        "How long does slab inspection take?",
        "Collections containing slabs are inspected within 14 days of delivery. We initiate payment the same day inspection confirms the items match the accepted offer.",
      ],
    ],
  },
  {
    slug: "sell-pokemon-cards",
    label: "Pokémon cards",
    blurb: "Graded, raw and sealed Pokémon.",
    title: "Sell Pokémon Cards: Graded, Raw & Sealed",
    description:
      "Sell Pokémon cards to a real card shop. We buy graded slabs, raw singles and sealed Pokémon products. Send photos and request a personal offer.",
    eyebrow: "POKÉMON",
    heading: "Sell your Pokémon cards.",
    lead: "We buy graded Pokémon slabs, raw (ungraded) cards and sealed Pokémon products. Send one request for a single card or a whole collection.",
    sections: [
      {
        heading: "Pokémon items we review",
        list: [
          "Graded cards from PSA, CGC, BGS and TAG.",
          "Raw cards. Tell us the set, card number, quantity and condition.",
          "Sealed products with their original, unopened seals.",
        ],
      },
      {
        heading: "You don’t need to know the value",
        text: [
          "You can add an asking price for each item, a total for the collection, or leave both blank. Share the details and photos and our team will review them.",
          "Offers depend on the item, its condition, current market conditions and our buying needs, so a request does not guarantee an offer.",
        ],
      },
      {
        heading: "Selling a large collection",
        text: [
          "Keep everything in one request. You can add items one at a time or import a spreadsheet of up to 50 rows using the template on the request form.",
        ],
      },
    ],
    faqs: [
      [
        "Do you buy ungraded Pokémon cards?",
        "Yes. We review raw Pokémon cards as well as graded slabs and sealed products. Tell us the set, quantity and condition.",
      ],
      [
        "Do I need to price my Pokémon cards first?",
        "No. An asking price is optional. You can price individual items, give one total, or leave it blank.",
      ],
      [
        "Can I sell a whole Pokémon collection at once?",
        "Yes. Add every item to one request, or import up to 50 rows from a spreadsheet.",
      ],
    ],
  },
  {
    slug: "sell-sports-cards",
    label: "Sports cards",
    blurb: "Football, baseball, basketball and more.",
    title: "Sell Sports Cards: Football, Baseball, Basketball & More",
    description:
      "Sell football, baseball, basketball, hockey and soccer cards. We review graded and raw sports cards and send a personal offer from our Idaho card shop.",
    eyebrow: "SPORTS CARDS",
    heading: "Sell your sports cards.",
    lead: "We review football, baseball, basketball, hockey and soccer cards, graded or raw, along with sealed sports products.",
    sections: [
      {
        heading: "Sports we review",
        list: ["Football", "Baseball", "Basketball", "Hockey", "Soccer"],
      },
      {
        heading: "What to tell us",
        list: [
          "Player, year, set and card number.",
          "For graded cards: the grading company (PSA, CGC, BGS or TAG) and grade.",
          "For raw cards: the condition and quantity.",
          "Photos of the front and back.",
        ],
      },
      {
        heading: "Prefer to aim for a higher price?",
        text: [
          "Consignment is an option. We can offer your cards in our store and on eBay, and you approve buyer offers before a sale is accepted. A higher payout isn’t guaranteed.",
        ],
        link: ["/consignment", "See consignment details"],
      },
    ],
    faqs: [
      [
        "Which sports cards do you buy?",
        "We review football, baseball, basketball, hockey and soccer cards, both graded and raw, plus sealed sports products.",
      ],
      [
        "Will every sports card get an offer?",
        "Not always. Offers depend on the item, its condition, current market conditions and our buying needs.",
      ],
    ],
  },
  {
    slug: "sell-one-piece-cards",
    label: "One Piece cards",
    blurb: "Graded, raw and sealed One Piece.",
    title: "Sell One Piece Cards: Graded, Raw & Sealed",
    description:
      "Sell One Piece cards to Lifestyle Cards & Collectibles. We review graded slabs, raw cards and sealed One Piece products. Request a personal offer.",
    eyebrow: "ONE PIECE",
    heading: "Sell your One Piece cards.",
    lead: "We review One Piece graded cards, raw cards and sealed products. Send your details and photos and our team will take a look.",
    sections: [
      {
        heading: "One Piece items we review",
        list: [
          "Graded cards from PSA, CGC, BGS and TAG.",
          "Raw cards, with the set, card number, quantity and condition.",
          "Sealed products with their original, unopened seals.",
        ],
      },
      {
        heading: "Direct offer or consignment",
        text: [
          "Choose a direct purchase offer from our shop, or consign and set a target price for each item. You pick the method on the request form.",
        ],
        link: ["/consignment", "Compare consignment"],
      },
    ],
    faqs: [
      [
        "Do you buy One Piece cards?",
        "Yes. We review graded and raw One Piece cards and sealed One Piece products.",
      ],
      [
        "Can I consign One Piece cards instead of selling them?",
        "Yes. Choose Consign with us on the request form and enter a target price for each item.",
      ],
    ],
  },
  {
    slug: "sell-sealed-products",
    label: "Sealed products",
    blurb: "Unopened boxes, cases and more.",
    title: "Sell Sealed Pokémon & Trading Card Products",
    description:
      "Sell sealed Pokémon, sports and One Piece products. Tell us the product and quantity, add photos, and get a personal offer from our Twin Falls card shop.",
    eyebrow: "SEALED PRODUCTS",
    heading: "Sell your sealed products.",
    lead: "We buy sealed Pokémon, sports and One Piece products. Tell us what you have and how many, and we’ll review it for an offer.",
    sections: [
      {
        heading: "What counts as sealed",
        text: [
          "Products described as sealed must have their original, unopened seals. We check this at inspection, along with quantity and condition.",
        ],
      },
      {
        heading: "What to send us",
        list: [
          "Product name and set.",
          "Quantity.",
          "Photos that show the seals and the condition of the packaging.",
          "An asking price, if you have one.",
        ],
      },
      {
        heading: "Faster inspection",
        text: [
          "Collections containing only sealed products or raw cards are inspected within 72 hours of delivery. We initiate payment the same day inspection confirms the items match the accepted offer.",
        ],
      },
    ],
    faqs: [
      [
        "How quickly are sealed products inspected?",
        "Collections containing only sealed products or raw cards are inspected within 72 hours of delivery to our shop.",
      ],
      [
        "Who pays for shipping?",
        "The seller pays shipping and insurance to our shop. Accept the offer and confirm shipping details with us before sending any items.",
      ],
    ],
  },
  {
    slug: "sell-cards-twin-falls-idaho",
    label: "Twin Falls, Idaho",
    blurb: "A local card shop behind every offer.",
    title: "Sell Trading Cards in Twin Falls, Idaho",
    description:
      "Sell Pokémon, sports cards and sealed products to Lifestyle Cards & Collectibles, a trading card shop at 1339 Filer Ave E in Twin Falls, Idaho.",
    eyebrow: "TWIN FALLS, IDAHO",
    heading: "Sell your cards to a Twin Falls card shop.",
    lead: "SellMySlabs is operated by Lifestyle Cards & Collectibles, a trading card shop in Twin Falls, Idaho. Every offer comes from our team.",
    showShop: true,
    sections: [
      {
        heading: "A real shop, not a marketplace",
        text: [
          "You deal with the people at our store. We review your items, make the offer and answer your questions by phone or email.",
        ],
      },
      {
        heading: "What we buy",
        list: [
          "Graded cards from PSA, CGC, BGS and TAG.",
          "Raw Pokémon, sports and One Piece cards.",
          "Sealed products.",
        ],
      },
      {
        heading: "Local to the Magic Valley?",
        text: [
          "Start with the same request form so we can review your items, or call the shop to ask about bringing a collection in.",
        ],
      },
    ],
    faqs: [
      [
        "Where is the shop?",
        "Lifestyle Cards & Collectibles is at 1339 Filer Ave E, Unit B, Twin Falls, ID 83301.",
      ],
      [
        "Do I have to live in Idaho to sell?",
        "No. Sellers ship items to our shop after accepting an offer and confirming shipping details with us. The seller pays shipping and insurance.",
      ],
    ],
  },
  {
    slug: "sell-or-consign-cards",
    comparison: true,
    label: "Sell or consign?",
    blurb: "Compare a direct offer with consignment.",
    title: "Sell or Consign Your Cards? How the Two Options Compare",
    description:
      "Compare a direct purchase offer with consignment at SellMySlabs: how pricing, shipping, inspection, fees and payment timing work for each.",
    eyebrow: "DIRECT OFFER OR CONSIGNMENT",
    heading: "Sell directly or consign?",
    lead: "There are two ways to sell through SellMySlabs. Take one purchase offer from our shop, or consign your items and aim for your target price.",
    sections: [
      {
        heading: "Selling directly",
        list: [
          "We make one total purchase offer for the items you list.",
          "You decide whether the offer works for you. There is no obligation to sell.",
          "The seller pays shipping and insurance to our shop.",
          "Collections containing slabs are inspected within 14 days of delivery; collections with only raw cards or sealed products within 72 hours.",
          "We initiate payment the same day inspection confirms the items match the accepted offer.",
        ],
        link: ["/purchase-terms", "Read the purchase terms"],
      },
      {
        heading: "Consigning",
        list: [
          "You set a target price for each item.",
          "We offer your items in our store and on eBay.",
          "Buyer offers go to your SellMySlabs account for your approval before we accept them.",
          `Marketplace and payment fees and a listing fee come out of the sale first. Your payout rate, from ${PAYOUT_RANGE} depending on the item sale price, applies to the remainder.`,
          "We initiate your payout immediately after we receive the buyer’s payment.",
        ],
        link: ["/consignment", "See payout tiers and listing fees"],
      },
      {
        heading: "Which one fits?",
        text: [
          "A direct offer suits sellers who want one agreed price and payment once inspection is complete.",
          "Consignment suits sellers who have a price in mind and are comfortable waiting for a buyer. A higher payout isn’t guaranteed: your return depends on the sale price, fees and payout tier.",
        ],
      },
      {
        heading: "Choose on the request form",
        text: [
          "Both options start with the same form. Pick Sell directly or Consign with us at the top, then add your items and photos.",
        ],
      },
    ],
    faqs: [
      [
        "Is consignment guaranteed to pay more than a direct offer?",
        "No. Your consignment return depends on the sale price, fees and payout tier, and payment follows the buyer’s payment.",
      ],
      [
        "When am I paid?",
        "For a direct purchase, we initiate payment the same day inspection confirms the items match the accepted offer. For consignment, we initiate your payout immediately after we receive the buyer’s payment.",
      ],
      [
        "Do I approve the sale price when I consign?",
        "Yes. You set a target price for each item, and buyer offers are sent to your SellMySlabs account for approval before we accept them.",
      ],
    ],
  },
];

export const SELL_PROCESS = SHARED_PROCESS;
export const BUY_GUIDES = SELL_GUIDES.filter((g) => !g.comparison);
export const sellGuide = (slug) => SELL_GUIDES.find((g) => g.slug === slug);
