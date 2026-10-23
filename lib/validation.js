import { z } from "zod";
import { GRADERS, CATEGORIES } from "./site";
export const cardSchema = z.object({
  name: z.string().trim().min(2, "Enter the card name.").max(180),
  category: z.enum(CATEGORIES),
  grader: z.enum(GRADERS),
  grade: z.string().trim().min(1, "Enter the grade.").max(30),
  cert: z.string().trim().max(80).default(""),
  quantity: z.coerce.number().int().min(1).max(10000),
  asking: z
    .string()
    .trim()
    .max(20)
    .refine(
      (v) => !v || /^\d+(\.\d{1,2})?$/.test(v),
      "Use a price such as 125.00.",
    ),
});
export const submissionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40),
  notes: z.string().trim().max(4000),
  cards: z.array(cardSchema).min(1).max(50),
  consent: z.literal(true),
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
  offerVersion: z.number().int().min(0).default(0),
  id: z.string().uuid(),
  status: z.enum(STATUSES),
  notes: z.string().max(10000),
  offer: z
    .string()
    .max(20)
    .refine((v) => !v || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0 && Number(v) <= 999999999999.99)),
});
