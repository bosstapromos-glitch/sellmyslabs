import { MAX_SUBMISSION_PHOTOS } from "./photo-selection";
import { cardSchema, askingTotalSchema, submissionSchema } from "./validation";
import { missingItemPhotos, missingPhotosMessage } from "./photo-labels";

const contactSchema = submissionSchema.pick({
  name: true,
  email: true,
  phone: true,
  contactMethod: true,
  city: true,
  state: true,
  zip: true,
  notes: true,
});
const REQUIRED_LOCATION = {
  city: "Enter your city.",
  state: "Enter your state.",
  zip: "Enter your ZIP code.",
};

// The customer flow uses the same rules as the submission API. When the
// photos themselves are passed, each graded card must have a front and back.
export function stepErrors(draft, photoCount, step, photos = null) {
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
    if (photos)
      for (const { index, sides } of missingItemPhotos(draft.cards, photos))
        errors[`item-${index}-photos`] ??= missingPhotosMessage(sides);
    if (!photoCount) errors.photos = "Add at least one photo of your items.";
    else if (photoCount > MAX_SUBMISSION_PHOTOS)
      errors.photos = `Keep up to ${MAX_SUBMISSION_PHOTOS} photos. Remove extras before continuing.`;
  } else if (step === 1) {
    collect(contactSchema.safeParse(draft));
    for (const [field, message] of Object.entries(REQUIRED_LOCATION))
      if (!String(draft[field] || "").trim()) errors[field] ??= message;
  } else if (draft.consent !== true) {
    errors.consent =
      "Please give us permission to review your request and contact you.";
  }
  return errors;
}
