"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { requestJSON } from "../../lib/request-json";
import { hasOwnerEdits, hasSellerContextEdits } from "../../lib/owner-edits";
import useUnsavedChanges from "../components/useUnsavedChanges";
import OfferEmailStatus from "./OfferEmailStatus";
import OfferContext from "./OfferContext";
import PhotoReview from "./PhotoReview";
import SlabResearch from "./SlabResearch";
import { itemDetails } from "../../lib/site";
import { STATUSES } from "../../lib/validation";
import { normalizeOfferPrice, OFFER_PRICE_ERROR } from "../../lib/offer-price";
export default function Workspace({ authenticated }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [actionBusy, setBusy] = useState(false);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const busy = actionBusy || preparingPhotos;
  const [error, setError] = useState("");
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [offer, setOffer] = useState("");
  const [sellerMessage, setSellerMessage] = useState("");
  const [offerPhotos, setOfferPhotos] = useState([]);
  const [newOfferPhotos, setNewOfferPhotos] = useState([]);
  const [saved, setSaved] = useState(false);
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(authenticated);
  const [listError, setListError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [conflict, setConflict] = useState(false);
  const sellerContext = { sellerMessage, offerPhotos, newOfferPhotos };
  const changedContext = hasSellerContextEdits(selected, sellerContext);
  const unsaved = hasOwnerEdits(selected, {
    offer,
    notes,
    status,
    ...sellerContext,
  });
  const { confirmLeave: mayLeave, allowUnload } = useUnsavedChanges(
    unsaved || preparingPhotos,
  );
  const details = useRef(null);
  const editorError = useRef(null);
  useEffect(() => {
    if (error) editorError.current?.focus();
  }, [error]);
  function showError(error) {
    setConflict(error.status === 409);
    setError(
      error.message || "Could not complete that request. Please try again.",
    );
    if (error.status === 401) setSessionExpired(true);
  }

  const requestSequence = useRef(0);
  const refresh = useCallback(async () => {
    setLoadingList(true);
    setListError("");
    try {
      const data = await requestJSON(
        "/api/admin/submissions",
        {},
        "Could not load requests. Try refreshing the inbox.",
      );
      setList(data.submissions);
      setSessionExpired(false);
    } catch (error) {
      setListError(error.message);
      if (error.status === 401) setSessionExpired(true);
    } finally {
      setLoadingList(false);
    }
  }, []);
  async function open(id, { reload = false } = {}) {
    if (selected?.id === id && unsaved && !reload) {
      setDetailOpen(true);
      return;
    }
    if (!mayLeave()) return;
    const sequence = ++requestSequence.current;
    setConflict(false);
    setDetailOpen(true);
    setLoading(true);
    setError("");
    setSaved(false);
    setSelected(null);
    try {
      const d = await requestJSON(
        `/api/admin/submissions?id=${id}`,
        {},
        "Could not open this request. Return to the inbox and try again.",
      );
      if (sequence !== requestSequence.current) return;
      setSessionExpired(false);
      setSelected(d.submission);
      setStatus(d.submission.status);
      setNotes(d.submission.internal_notes);
      setOffer(d.submission.offer ?? "");
      setSellerMessage(d.submission.offer_message || "");
      setOfferPhotos(d.submission.offer_photos || []);
      setNewOfferPhotos([]);
    } catch (e) {
      if (sequence === requestSequence.current) showError(e);
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (detailOpen && window.matchMedia("(max-width: 900px)").matches) {
      details.current?.focus({ preventScroll: true });
      details.current?.scrollIntoView({ block: "start" });
    }
  }, [detailOpen]);
  function backToInbox() {
    requestSequence.current++;
    setLoading(false);
    setDetailOpen(false);
    requestAnimationFrame(() =>
      document.querySelector(".inbox-item.active, .admin-search")?.focus(),
    );
  }
  useEffect(() => {
    if (authenticated) {
      refresh();
      const id = new URLSearchParams(location.search).get("id");
      if (id) open(id);
    } else if (new URLSearchParams(location.search).has("error"))
      setError(
        "That sign-in link has expired or was already used. Request a new one.",
      );
  }, [authenticated, refresh]);
  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await requestJSON("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    if (normalizeOfferPrice(String(offer)) === null) {
      setSaved(false);
      setError(OFFER_PRICE_ERROR);
      return;
    }
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const body = new FormData();
      body.set(
        "data",
        JSON.stringify({
          id: selected.id,
          status,
          notes,
          offer: String(offer),
          offerVersion: selected.offer_version,
          sellerMessage,
          keepPhotoIds: offerPhotos.map((photo) => photo.id),
        }),
      );
      newOfferPhotos.forEach((photo) => body.append("salesPhotos", photo));
      const d = await requestJSON("/api/admin/submissions", {
        method: "PATCH",
        body,
      });
      setSelected((current) => ({
        ...current,
        ...d.saved,
        offer_email: d.offer_email,
      }));
      setOffer(d.saved.offer ?? "");
      setSellerMessage(d.saved.offer_message || "");
      setOfferPhotos(d.saved.offer_photos || []);
      setNewOfferPhotos([]);
      setSaved(
        d.saved.queued_email
          ? d.offer_email?.status === "sent"
            ? "Offer saved and emailed to the seller."
            : "Offer saved. The email has not been confirmed; check its status below."
          : "Changes saved. No new offer email was sent.",
      );
      await refresh();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }
  async function retryEmail() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const data = await requestJSON("/api/admin/offer-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.offer_email.id }),
      });
      setSelected((current) => ({ ...current, offer_email: data.offer_email }));
      setSaved(
        data.offer_email?.status === "sent"
          ? "Offer emailed to the seller."
          : "Email is not confirmed yet. Check the status below.",
      );
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }
  async function checkDelivery() {
    const id = selected.id;
    const emailId = selected.offer_email.id;
    setCheckingDelivery(true);
    setError("");
    try {
      const data = await requestJSON(
        `/api/admin/offer-email?submissionId=${id}`,
        {},
        "Could not check delivery. Please try again.",
      );
      setSelected((current) =>
        current?.id === id && current.offer_email?.id === emailId
          ? { ...current, offer_email: data.offer_email }
          : current,
      );
    } catch (e) {
      showError(e);
    } finally {
      setCheckingDelivery(false);
    }
  }
  const normalizedOffer = normalizeOfferPrice(String(offer));
  const changedOffer =
    selected &&
    normalizedOffer !== null &&
    normalizedOffer !== "" &&
    (Number(normalizedOffer) !== Number(selected.offer) || changedContext);
  if (!authenticated)
    return (
      <div style={{ maxWidth: 500 }}>
        <p>
          Sign in with your owner email. We’ll send you a secure, single-use
          link.
        </p>
        {sent ? (
          <div className="success" role="status">
            If this address has workspace access, a sign-in link is on its way.
            Check your inbox and spam folder. The link is valid for 15 minutes.
            <button
              type="button"
              className="plain-button"
              onClick={() => setSent(false)}
            >
              Back to sign-in
            </button>
          </div>
        ) : (
          <form onSubmit={login} className="panel">
            <label className="field">
              Owner email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button
              style={{ marginTop: 20 }}
              className="button"
              disabled={busy}
            >
              {busy ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  const filtered = list.filter((s) =>
    `${s.seller_name} ${s.id} ${s.status}`
      .toLowerCase()
      .includes(filter.trim().toLowerCase()),
  );
  return (
    <>
      <div className={`admin-toolbar${detailOpen ? " detail-open" : ""}`}>
        <label>
          <span className="sr-only">Search requests</span>
          <input
            className="admin-search"
            type="search"
            placeholder="Search by name, reference or status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
        <div>
          <button
            className="plain-button"
            disabled={loadingList || busy}
            onClick={refresh}
          >
            {loadingList ? "Refreshing…" : "Refresh inbox"}
          </button>
          <button
            className="button quiet small"
            disabled={busy}
            onClick={async () => {
              if (!mayLeave()) return;
              setBusy(true);
              try {
                await requestJSON("/api/auth/logout", { method: "POST" });
                allowUnload();
                setSelected(null);
                location.assign("/admin");
              } catch (error) {
                showError(error);
                setBusy(false);
              }
            }}
          >
            Sign out
          </button>
        </div>
      </div>
      {sessionExpired && (
        <div className="error" role="alert">
          Your session has ended.{" "}
          <a
            className="text-link"
            href="/admin"
            target="_blank"
            rel="noopener noreferrer"
          >
            Sign in in a new tab
          </a>
          , then return here. Your unsaved edits stay on this page.
        </div>
      )}
      {error && !selected && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div className={`admin-grid${detailOpen ? " detail-open" : ""}`}>
        <aside aria-label="Submissions" aria-busy={loadingList}>
          {listError && (
            <div className="error" role="alert">
              <p>{listError}</p>
              <button
                type="button"
                className="plain-button"
                onClick={refresh}
                disabled={loadingList}
              >
                Try again
              </button>
            </div>
          )}
          <p className="hint" role="status">
            {loadingList
              ? "Loading requests…"
              : `${filtered.length} request${filtered.length === 1 ? "" : "s"}${filter ? " found" : " · newest first"}`}
          </p>
          {filtered.map((s) => (
            <button
              key={s.id}
              disabled={busy}
              className={`inbox-item ${selected?.id === s.id ? "active" : ""}`}
              aria-current={selected?.id === s.id ? "true" : undefined}
              onClick={() => open(s.id)}
            >
              <strong>{s.seller_name}</strong>
              <small>
                {new Date(s.created_at).toLocaleDateString()} · {s.card_count}{" "}
                {s.card_count === 1 ? "item entry" : "item entries"}
              </small>
              <span className="badge">{s.status}</span>
              {!s.notified_at && <small>Notification pending</small>}
            </button>
          ))}
          {!loadingList && !listError && !filtered.length && (
            <div className="empty-state">
              <h2>{filter ? "No matching requests" : "No requests yet"}</h2>
              <p>
                {filter
                  ? "Try a name, reference or status."
                  : "New submissions will appear here when someone requests an offer."}
              </p>
              {filter && (
                <button
                  type="button"
                  className="button secondary small"
                  onClick={() => setFilter("")}
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </aside>
        <section
          ref={details}
          tabIndex={-1}
          className="request-details"
          aria-label="Request details"
          aria-busy={loading}
        >
          <button
            type="button"
            className="button quiet back-to-inbox"
            onClick={backToInbox}
            disabled={busy}
          >
            ← Inbox
          </button>
          {loading ? (
            <p className="panel" role="status">
              Opening request…
            </p>
          ) : !selected ? (
            <div className="panel">
              <h2>Select a request</h2>
              <p>
                Select a request to review its cards, photos and contact
                details.
              </p>
            </div>
          ) : (
            <>
              <div className="panel">
                <span className="eyebrow">
                  REQUEST {selected.id.slice(0, 8).toUpperCase()}
                </span>
                <div className="request-heading">
                  <h2>{selected.seller_name}</h2>
                  <a className="text-link" href="#offer-editor">
                    Go to offer ↓
                  </a>
                </div>
                <p>
                  <a className="text-link" href={`mailto:${selected.email}`}>
                    {selected.email}
                  </a>
                  {selected.phone && (
                    <>
                      <br />
                      <a href={`tel:${selected.phone}`}>{selected.phone}</a>
                    </>
                  )}
                </p>
                <p className="hint">
                  Received {new Date(selected.created_at).toLocaleString()}
                </p>
                <p className="asking-total">
                  <strong>Seller’s total asking price:</strong>{" "}
                  {selected.asking_total != null
                    ? `$${Number(selected.asking_total).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "Not specified · open to an offer"}
                </p>
                {selected.seller_notes && (
                  <p style={{ whiteSpace: "pre-wrap" }}>
                    {selected.seller_notes}
                  </p>
                )}
              </div>
              <div className="panel">
                <h2>Items to review</h2>
                {selected.cards.map((c, i) => (
                  <div className="review-row" key={i}>
                    <div>
                      <strong>{c.name}</strong>
                      <br />
                      <span>
                        {c.category} · {itemDetails(c)} · Qty {c.quantity}
                        {c.cert && ` · Cert ${c.cert}`}
                      </span>
                    </div>
                    <span>
                      {c.asking ? `$${c.asking} each` : "Open to an offer"}
                    </span>
                  </div>
                ))}
                <PhotoReview
                  key={selected.id}
                  id={selected.id}
                  photos={selected.photos}
                />
                <SlabResearch cards={selected.cards} />
              </div>
              <form
                id="offer-editor"
                className="panel offer-editor"
                onSubmit={save}
              >
                <div className="card-heading">
                  <h2>Your offer</h2>
                  {unsaved && <span className="hint">Unsaved changes</span>}
                </div>
                <fieldset disabled={busy} className="form-fields">
                  <div className="field-grid">
                    <label className="field">
                      Status
                      <select
                        value={status}
                        onChange={(e) => {
                          setStatus(e.target.value);
                          setSaved(false);
                        }}
                      >
                        {STATUSES.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Total offer (USD)
                      <input
                        inputMode="decimal"
                        aria-invalid={error === OFFER_PRICE_ERROR || undefined}
                        aria-describedby={
                          error === OFFER_PRICE_ERROR
                            ? "offer-error offer-help"
                            : "offer-help"
                        }
                        value={offer}
                        maxLength={20}
                        onChange={(e) => {
                          setOffer(e.target.value);
                          if (error === OFFER_PRICE_ERROR) setError("");
                          setSaved(false);
                        }}
                        placeholder="Optional"
                      />
                    </label>
                    <div className="full">
                      <OfferContext
                        key={selected.id}
                        id={selected.id}
                        message={sellerMessage}
                        onMessage={(value) => {
                          setSellerMessage(value);
                          setSaved(false);
                        }}
                        photos={offerPhotos}
                        onPhotos={(value) => {
                          setOfferPhotos(value);
                          setSaved(false);
                        }}
                        files={newOfferPhotos}
                        onFiles={(value) => {
                          setNewOfferPhotos(value);
                          setSaved(false);
                        }}
                        preparing={preparingPhotos}
                        onPreparing={setPreparingPhotos}
                        onError={setError}
                      />
                    </div>
                    <label className="field full">
                      Private notes
                      <textarea
                        maxLength={10000}
                        value={notes}
                        onChange={(e) => {
                          setNotes(e.target.value);
                          setSaved(false);
                        }}
                      />
                    </label>
                  </div>
                </fieldset>
                <p className="hint" id="offer-help">
                  {normalizedOffer && normalizedOffer !== null
                    ? `Changes to the price, seller message or sales photos email the offer to ${selected.email}, with a private copy to you.`
                    : "Add a price when you’re ready to email the offer. Messages and sales photos can be saved as a draft."}{" "}
                  Private notes and status changes stay private.
                </p>
                <button className="button" disabled={busy || !unsaved}>
                  {busy
                    ? preparingPhotos
                      ? "Preparing photos…"
                      : "Saving…"
                    : changedOffer
                      ? "Save & email offer"
                      : "Save changes"}
                </button>
                {error && (
                  <div
                    className="error"
                    role="alert"
                    id="offer-error"
                    ref={editorError}
                    tabIndex={-1}
                  >
                    <p>{error}</p>
                    {conflict && (
                      <button
                        type="button"
                        className="plain-button"
                        onClick={() => open(selected.id, { reload: true })}
                      >
                        Reload request
                      </button>
                    )}
                  </div>
                )}
                {saved && (
                  <p className="success" role="status">
                    {saved}
                  </p>
                )}
                <OfferEmailStatus
                  email={selected.offer_email}
                  busy={busy}
                  checking={checkingDelivery}
                  canRetry={
                    normalizedOffer !== null &&
                    normalizedOffer !== "" &&
                    !changedOffer
                  }
                  onCheck={checkDelivery}
                  onRetry={retryEmail}
                />
              </form>
            </>
          )}
        </section>
      </div>
    </>
  );
}
