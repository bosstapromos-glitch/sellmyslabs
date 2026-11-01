export default function OfferAcceptance({
  email,
  history = [],
  busy,
  unsaved,
  activeOffer,
  onSend,
  onRefresh,
  onRetryReceipt,
}) {
  const acceptance = email?.acceptance;
  const previous = history.filter((record) => record.id !== email?.id);
  return (
    <section className="offer-email" aria-label="Seller acceptance">
      <h3>Seller acceptance</h3>
      {acceptance ? (
        <>
          {acceptance.accepted_at ? (
            <div className="delivery-state delivery-success" role="status">
              <strong>Accepted</strong>
              <p>
                {acceptance.accepted_name} ·{" "}
                {new Date(acceptance.accepted_at).toLocaleString()}
              </p>
              <p className="hint">
                {acceptance.receipt?.status === "sent"
                  ? "Confirmation email sent to the seller, with your copy."
                  : "The acceptance is saved. Its confirmation email has not been confirmed as sent."}
              </p>
            </div>
          ) : (
            <p>
              Awaiting the seller’s acceptance of the listed offer and Purchase
              Terms.
            </p>
          )}
          <div className="offer-email-actions">
            <a
              className="text-link"
              href={acceptance.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {acceptance.accepted_at
                ? "View acceptance record ↗"
                : "View seller’s offer ↗"}
            </a>
            <button
              type="button"
              className="button secondary small"
              disabled={busy || unsaved}
              onClick={onRefresh}
            >
              Refresh acceptance
            </button>
            {acceptance.receipt?.can_retry && (
              <button
                type="button"
                className="button secondary small"
                disabled={busy || unsaved}
                onClick={onRetryReceipt}
              >
                Retry confirmation email
              </button>
            )}
          </div>
          {unsaved && (
            <p className="hint">
              Save your changes before refreshing acceptance.
            </p>
          )}
          {acceptance.accepted_at && (
            <p className="hint">
              Changing the price, seller message or sales photos sends a new
              offer for the seller to review. Their earlier acceptance remains
              on record.
            </p>
          )}
        </>
      ) : (
        <>
          <p>This request does not have an online acceptance record yet.</p>
          {activeOffer && (
            <>
              <button
                type="button"
                className="button secondary small"
                disabled={busy || unsaved}
                onClick={onSend}
              >
                Email offer with purchase terms
              </button>
              <p className="hint">
                Sends the current total and items with a private acceptance
                link.{" "}
                {unsaved
                  ? "Save your changes first."
                  : "The seller receives the offer again, and you receive a copy."}
              </p>
            </>
          )}
        </>
      )}
      {previous.length > 0 && (
        <div className="purchase-history">
          <h4>Earlier acceptances</h4>
          <ul>
            {previous.map((record) => (
              <li key={record.id}>
                <a
                  className="text-link"
                  href={record.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ${Number(record.amount).toFixed(2)} · {record.accepted_name} ·{" "}
                  {new Date(record.accepted_at).toLocaleDateString()} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
