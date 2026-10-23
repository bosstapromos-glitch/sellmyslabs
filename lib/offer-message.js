import { BUSINESS } from './site';
export function offerMessage(submission, amount, { from, replyTo, site }) {
  const total = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
  const reference = submission.id.slice(0, 8).toUpperCase();
  const quantity = submission.cards.reduce((sum, card) => sum + card.quantity, 0);
  const cards = submission.cards.map(card => `• ${card.name} — ${card.grader} ${card.grade}${card.quantity > 1 ? ` · Qty ${card.quantity}` : ''}`).join('\n');
  return {
    from, to: [submission.email], reply_to: replyTo,
    subject: `Your ${total} SellMySlabs offer · ${reference}`,
    text: `Hi ${submission.seller_name},\n\nThank you for submitting your cards to SellMySlabs. We’ve reviewed your submission and would like to offer ${total} total for ${quantity === 1 ? 'your card' : `all ${quantity} cards`}:\n\n${cards}\n\nIf you’d like to move forward, please reply to this email. We’ll confirm shipping, inspection, and payment details with you before you send any cards.\n\nSubmission reference: ${reference}\n\nThank you,\nJT\nSellMySlabs | ${BUSINESS.name}\n${site}\n${BUSINESS.phone}`,
  };
}
