import { cardSchema, askingTotalSchema, submissionSchema } from "./validation";

const contactSchema = submissionSchema.pick({
  name: true,
  email: true,
  phone: true,
  notes: true,
});

// The customer flow uses the same rules as the submission API.
export function stepErrors(draft, photoCount, step) {
  const errors = {};
  const collect = (result, prefix = "") => {
    if (!result.success)
      for (const issue of result.error.issues) {
        const key = prefix + issue.path[0];
        errors[key] ??= issue.message;
      }
  };
  if (step === 0) {
    draft.cards.forEach((item, index) =>
      collect(cardSchema.safeParse(item), `item-${index}-`),
    );
    const total = askingTotalSchema.safeParse(draft.askingTotal);
    if (!total.success) errors.askingTotal = total.error.issues[0].message;
    if (!photoCount) errors.photos = "Add at least one photo of your items.";
    else if (photoCount > 8)
      errors.photos = "Keep up to 8 photos. Remove extras before continuing.";
  } else if (step === 1) {
    collect(contactSchema.safeParse(draft));
  } else if (draft.consent !== true) {
    errors.consent =
      "Please give us permission to review your request and contact you.";
  }
  return errors;
}
