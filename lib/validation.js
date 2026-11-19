import { SALE_METHODS, CONSIGNMENT_STATUSES } from "./sale-method";
import { z } from "zod";
import { normalizeOfferPrice, OFFER_PRICE_ERROR } from "./offer-price";
import { GRADERS, CATEGORIES, ITEM_TYPES } from "./site";
export const CONTACT_METHODS = ["email", "phone", "text"];
export const askingTotalSchema = z
  .string()
  .trim()
  .max(20)
  .refine(
    (v) =>
      !v ||
      (/^\d+(\.\d{1,2})?$/.test(v) &&
        Number(v) > 0 &&
        Number(v) <= 999999999999.99),
    "Enter a total asking price greater than zero, such as 250.00, or leave it blank.",
  )
  .default("");
export const cardSchema = z
  .object({
    itemType: z
      .enum(ITEM_TYPES, { error: "Choose an item type." })
      .default("Graded card"),
    condition: z.string().trim().max(500).default(""),
    name: z.string().trim().min(2, "Enter the card or product name.").max(180),
    category: z.enum(CATEGORIES, { error: "Choose a category." }),
    grader: z.union([z.enum(GRADERS), z.literal("")]).default(""),
    grade: z.string().trim().max(30).default(""),
    cert: z.string().trim().max(80).default(""),
    quantity: z.coerce
      .number({ error: "Enter a whole-number quantity from 1 to 10,000." })
      .int("Enter a whole-number quantity.")
      .min(1, "Enter a quantity of at least 1.")
      .max(10000, "Enter a quantity of 10,000 or less."),
    asking: z
      .string()
      .trim()
      .max(20)
      .refine(
        (v) =>
          !v ||
          (/^\d+(\.\d{1,2})?$/.test(v) &&
            Number(v) > 0 &&
            Number(v) <= 999999999999.99),
        "Enter a price greater than zero, such as 125.00, or leave it blank.",
      ),
  })
  .superRefine((item, ctx) => {
    if (item.itemType === "Graded card") {
      if (!GRADERS.includes(item.grader))
        ctx.addIssue({
          code: "custom",
          path: ["grader"],
          message: "Choose a grading company.",
        });
      if (!item.grade)
        ctx.addIssue({
          code: "custom",
          path: ["grade"],
          message: "Enter the grade.",
        });
    }
  })
  .transform((item) =>
    item.itemType === "Graded card"
      ? item
      : { ...item, grader: "", grade: "", cert: "" },
  );
export const submissionSchema = z.object({
  saleMethod: z
    .enum(SALE_METHODS, { error: "Choose how you’d like to sell." })
    .default("direct"),
  id: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(2, "Enter your name (at least 2 characters).")
    .max(120, "Keep your name under 120 characters."),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address, such as name@example.com.")
    .max(254),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine(
      (v) => {
        const digits = v.replace(/\D/g, "").length;
        return digits >= 10 && digits <= 15;
      },
      "Enter a phone number with area code, such as (208) 555-0100.",
    ),
  // The fields below default to empty so a tab opened before they existed can
  // still send its request; the form itself requires city, state and ZIP.
  contactMethod: z
    .enum(CONTACT_METHODS, { error: "Choose how we should contact you." })
    .default("email"),
  city: z.string().trim().max(80).default(""),
  state: z.string().trim().max(40).default(""),
  zip: z
    .string()
    .trim()
    .max(12)
    .refine(
      (v) => !v || /^[A-Za-z0-9][A-Za-z0-9 -]{2,10}$/.test(v),
      "Enter a ZIP or postal code, such as 83301.",
    )
    .default(""),
  marketingEmail: z.boolean().default(false),
  marketingText: z.boolean().default(false),
  notes: z.string().trim().max(4000),
  askingTotal: askingTotalSchema,
  cards: z.array(cardSchema).min(1).max(50),
  consent: z.literal(true, {
    error: "Please give us permission to review your request and contact you.",
  }),
  website: z.string().max(0),
});
export const STATUSES = [
  "New",
  "Reviewing",
  "Offer ready",
  "Agreed",
  "Awaiting cards",
  "Paid",
  "Closed",
];
export const updateSchema = z.object({
  editVersion: z.number().int().min(0).default(0),
  requestAcceptance: z.boolean().default(false),
  sellerMessage: z
    .string()
    .trim()
    .max(3000, "Keep the seller message under 3,000 characters.")
    .optional(),
  keepPhotoIds: z
    .array(z.string().regex(/^[a-f\d]{64}$/))
    .max(3)
    .optional(),
  offerVersion: z.number().int().min(0).default(0),
  id: z.string().uuid(),
  status: z.enum([...new Set([...STATUSES, ...CONSIGNMENT_STATUSES])]),
  notes: z.string().max(10000),
  offer: z
    .string()
    .max(20)
    .transform(normalizeOfferPrice)
    .refine((v) => v !== null, OFFER_PRICE_ERROR),
});
