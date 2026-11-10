export default function AccountDraftStatus({ account, disabled }) {
  if (account.loading)
    return (
      <p className="hint" role="status">
        Checking saved drafts…
      </p>
    );
  return (
    <section className="account-draft-status" aria-label="Save your draft">
      {account.active ? (
        <>
          <p role="status">
            {account.error
              ? "Changes not saved."
              : account.saving || account.dirty
                ? "Saving to your account…"
                : "Saved to your account."}{" "}
            <a className="text-link" href="/account/drafts">
              Your drafts
            </a>
          </p>
          <p className="hint">
            Continue on another device by signing in to the same account. Photos
            are kept for 30 days from upload.
          </p>
        </>
      ) : account.user ? (
        <>
          <p>Continue on another device.</p>
          <button
            className="button secondary"
            type="button"
            disabled={disabled || account.saving || account.blocked}
            onClick={() => account.save().catch(() => {})}
          >
            Save draft to my account
          </button>
          <a className="plain-button" href="/account/drafts">
            Your drafts
          </a>
        </>
      ) : (
        <p>
          To continue on another device,{" "}
          <a
            className="text-link"
            href={`/sign-in?redirect_url=${encodeURIComponent(typeof window === "undefined" ? "/sell" : window.location.pathname + window.location.search)}`}
          >
            sign in to save this draft to your account
          </a>
          . You can still submit without an account.
        </p>
      )}
      {account.error && (
        <div role="alert">
          <p>{account.error}</p>
          {account.active && !account.user && (
            <p>
              <a
                className="text-link"
                href={`/sign-in?redirect_url=${encodeURIComponent(window.location.pathname + window.location.search)}`}
              >
                Sign in again to save your changes
              </a>
            </p>
          )}
          {account.conflict || account.blocked ? (
            <>
              <p>
                Your changes are still on this screen. Opening the latest saved
                draft replaces them.
              </p>
              <button
                type="button"
                className="plain-button"
                onClick={() => account.reload()}
              >
                Open latest saved draft
              </button>
            </>
          ) : (
            <button
              type="button"
              className="plain-button"
              onClick={() =>
                account.active
                  ? account.save().catch(() => {})
                  : window.location.reload()
              }
            >
              Try again
            </button>
          )}
        </div>
      )}
    </section>
  );
}
