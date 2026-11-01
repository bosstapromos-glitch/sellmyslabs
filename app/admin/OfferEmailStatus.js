export default function OfferEmailStatus({
  email,
  busy,
  checking,
  canRetry,
  onCheck,
  onRetry,
}) {
  if (!email) return null;
  return (
    <section className="offer-email" aria-label="Offer email delivery">
      <div className="offer-email-heading">
        <h3>Offer email</h3>
        <strong>${Number(email.amount).toFixed(2)}</strong>
      </div>
      <div role="status" aria-live="polite">
        {email.delivery ? (
          <div className={`delivery-state delivery-${email.delivery.tone}`}>
            <strong>{email.delivery.label}</strong>
            <p>{email.delivery.detail}</p>
            {email.delivery.checked_at && (
              <p className="hint">
                Checked {new Date(email.delivery.checked_at).toLocaleString()}.
              </p>
            )}
          </div>
        ) : (
          <p className="hint">
            {email.status === "sending" && !email.can_retry
              ? "Email is sending. Check delivery again shortly."
              : "Email has not been confirmed as sent."}
          </p>
        )}
      </div>
      {email.sent_at && (
        <p className="hint">Sent {new Date(email.sent_at).toLocaleString()}.</p>
      )}
      <div className="offer-email-actions">
        <button
          type="button"
          className="button secondary small"
          disabled={busy || checking}
          onClick={onCheck}
        >
          {checking ? "Checking…" : "Check delivery"}
        </button>
        {email.can_retry && (
          <button
            type="button"
            className="button secondary small"
            disabled={busy || !canRetry}
            onClick={onRetry}
          >
            Retry offer email
          </button>
        )}
      </div>
      {!email.can_retry && !["sent", "sending"].includes(email.status) && (
        <p className="hint">
          Check with the seller before sending another offer. This email may be
          outdated or its safe retry window may have ended.
        </p>
      )}
    </section>
  );
}
