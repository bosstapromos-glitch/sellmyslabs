const events = {
  delivered: ['Delivered', 'The email provider confirms delivery. This does not confirm it was read.', 'success'],
  sent: ['Sent · awaiting delivery', 'The email was sent. Delivery has not been confirmed yet.', 'pending'],
  queued: ['Queued', 'The email provider is preparing to send this message.', 'pending'],
  scheduled: ['Scheduled', 'The email is scheduled to send.', 'pending'],
  delivery_delayed: ['Delivery delayed', 'The recipient’s email service has delayed delivery. Check again shortly.', 'warning'],
  bounced: ['Not delivered', 'The recipient’s email service rejected the message. Check their email address before contacting them again.', 'error'],
  failed: ['Not delivered', 'The email provider reported a delivery failure.', 'error'],
  suppressed: ['Not delivered', 'The email provider blocked delivery to this recipient.', 'error'],
  complained: ['Marked as spam', 'A spam complaint was reported for this email. Do not resend it.', 'error'],
  opened: ['Opened', 'The email provider recorded an open. Automated email previews can also trigger this.', 'success'],
  clicked: ['Link clicked', 'The email provider recorded a link click. Automated checks can also trigger this.', 'success'],
};

export async function emailDeliveryStatus(providerId, { apiKey = process.env.RESEND_API_KEY, fetchEmail = fetch } = {}) {
  try {
    if (!apiKey || !providerId) throw Error('Unavailable');
    const response = await fetchEmail(`https://api.resend.com/emails/${encodeURIComponent(providerId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store', signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw Error('Unavailable');
    const data = await response.json();
    const event = events[data.last_event];
    if (!event) throw Error('Unknown status');
    return { status: data.last_event, label: event[0], detail: event[1], tone: event[2], checked_at: new Date().toISOString() };
  } catch {
    return { status: 'unavailable', label: 'Delivery status unavailable', detail: 'The email was sent, but its latest delivery status could not be checked. Try again shortly.', tone: 'warning', checked_at: null };
  }
}
