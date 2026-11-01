import { BUSINESS, itemDetails } from "./site";
export function offerMessage(submission, amount, { from, replyTo, site }) {
  const total = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
  const reference = submission.id.slice(0, 8).toUpperCase();
  const quantity = submission.cards.reduce(
    (sum, card) => sum + card.quantity,
    0,
  );
  const hasProducts = submission.cards.some(
    (card) => card.itemType === "Sealed product",
  );
  const noun = hasProducts ? "item" : "card";
  const cards = submission.cards
    .map(
      (card) =>
        `• ${card.name} — ${itemDetails(card)}${card.quantity > 1 ? ` · Qty ${card.quantity}` : ""}`,
    )
    .join("\n");
  const note = submission.offer_message?.trim();
  const photos = submission.offer_photos || [];
  const context = `${note ? `\n\nA note about your offer:\n${note}` : ""}${photos.length ? `\n\nAttached: ${photos.length} sales photo${photos.length === 1 ? "" : "s"} for reference.` : ""}`;
  return {
    from,
    to: [submission.email],
    reply_to: replyTo,
    // Keep an exact private owner copy; avoid duplicating owner-addressed tests.
    ...(submission.email.trim().toLowerCase() !== replyTo.trim().toLowerCase()
      ? { bcc: [replyTo] }
      : {}),
    subject: `Your ${total} SellMySlabs offer · ${reference}`,
    ...(photos.length
      ? {
          attachments: photos.map(({ filename, content }) => ({
            filename,
            content,
          })),
        }
      : {}),
    text: `Hi ${submission.seller_name},\n\nThank you for submitting your ${noun}s to SellMySlabs. We’ve reviewed your submission and would like to offer ${total} total for ${quantity === 1 ? `your ${noun}` : `all ${quantity} ${noun}s`}:\n\n${cards}${context}\n\nIf you’d like to move forward, please reply to this email. We’ll confirm shipping, inspection, and payment details with you before you send any items.\n\nSubmission reference: ${reference}\n\nThank you,\nJT\nSellMySlabs | ${BUSINESS.name}\n${site}\n${BUSINESS.phone}`,
  };
}
