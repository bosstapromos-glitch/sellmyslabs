import { z } from "zod";

// For larger purchases the shop needs to know exactly who it is paying and
// where they are: the seller's legal name (the name they accept with) and a
// mailing address, collected when they accept the offer.
export const ADDRESS_THRESHOLD = 500;
export const needsSellerAddress = (amount) =>
  Number(amount) >= ADDRESS_THRESHOLD;

const line = (label, max, min = 1) =>
  z
    .string({ error: `Enter your ${label}.` })
    .trim()
    .min(min, `Enter your ${label}.`)
    .max(max, `Keep your ${label} under ${max} characters.`)
    .refine(
      (v) => !/[\u0000-\u001f\u007f]/.test(v),
      `Enter your ${label} on one line.`,
    );

export const sellerAddressSchema = z.object(
  {
    street: line("street address", 200, 3),
    unit: z.string().trim().max(100).default(""),
    city: line("city", 80),
    state: line("state", 40),
    zip: z
      .string({ error: "Enter your ZIP code." })
      .trim()
      .regex(
        /^[A-Za-z0-9][A-Za-z0-9 -]{2,10}$/,
        "Enter a ZIP or postal code, such as 83301.",
      ),
  },
  { error: "Enter your mailing address." },
);

export const addressLines = (address) =>
  address
    ? [
        [address.street, address.unit].filter(Boolean).join(", "),
        `${address.city}, ${address.state} ${address.zip}`,
      ]
    : [];
