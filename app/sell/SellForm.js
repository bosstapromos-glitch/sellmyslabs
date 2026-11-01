"use client";
import { useEffect, useRef, useState } from "react";
import { GRADERS, CATEGORIES, ITEM_TYPES, itemDetails } from "../../lib/site";
import {
  submissionSchema,
  cardSchema,
  askingTotalSchema,
} from "../../lib/validation";
import { preparePhoto } from "../../lib/prepare-photo";
import { importCards } from "../../lib/import-cards";
import {
  DRAFT_KEY as KEY,
  emptyCard,
  emptyDraft,
  restoreDraft,
  hasDraftContent,
} from "../../lib/draft";
import { requestJSON } from "../../lib/request-json";
import useUnsavedChanges from "../components/useUnsavedChanges";
export default function SellForm() {
  const [draft, setDraft] = useState(emptyDraft);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [preparing, setPreparing] = useState(false);
  const [reference, setReference] = useState("");
  const [restored, setRestored] = useState(false);
  const [draftAvailable, setDraftAvailable] = useState(true);
  const [errorField, setErrorField] = useState("");
  const errorSummary = useRef(null);
  const form = useRef(null);
  const heading = useRef(null);
  useUnsavedChanges(!reference && (photos.length > 0 || preparing || busy));
  useEffect(() => {
    if (error) errorSummary.current?.focus();
  }, [error]);
  useEffect(() => {
    if (reference) heading.current?.focus();
  }, [reference]);
  function reportError(message, field = "") {
    setErrorField(field);
    setError(message);
  }

  const files = useRef(null);
  const camera = useRef(null);
  useEffect(() => {
    try {
      const saved = restoreDraft(localStorage.getItem(KEY), () =>
        crypto.randomUUID(),
      );
      setDraft(saved);
      setRestored(hasDraftContent(saved));
    } catch {
      setDraft((d) => ({ ...d, id: crypto.randomUUID() }));
      setDraftAvailable(false);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && !reference) {
      try {
        localStorage.setItem(KEY, JSON.stringify({ ...draft, consent: false }));
        setDraftAvailable(true);
      } catch {
        setDraftAvailable(false);
      }
    }
  }, [draft, ready, reference]);
  function update(k, v) {
    setDraft((d) => ({ ...d, [k]: v }));
  }
  function card(i, k, v) {
    setDraft((d) => ({
      ...d,
      cards: d.cards.map((c, j) => (j === i ? { ...c, [k]: v } : c)),
    }));
  }
  function move(n) {
    setStep(n);
    setError("");
    setErrorField("");
    setTimeout(() => heading.current?.focus(), 0);
  }
  function next(e) {
    e.preventDefault();
    if (step === 0) {
      for (let i = 0; i < draft.cards.length; i++) {
        const result = cardSchema.safeParse(draft.cards[i]);
        if (!result.success) {
          reportError(
            `Item ${i + 1}: ${result.error.issues[0].message}`,
            `item-${i}-${result.error.issues[0].path[0]}`,
          );
          return;
        }
      }
      const total = askingTotalSchema.safeParse(draft.askingTotal);
      if (!total.success) {
        reportError(total.error.issues[0].message, "askingTotal");
        return;
      }
      if (!photos.length) {
        reportError(
          "Add at least one photo of your items before continuing.",
          "add-photo",
        );
        return;
      }
      move(1);
    } else if (step === 1) {
      const result = submissionSchema.safeParse({ ...draft, consent: true });
      if (!result.success) {
        setError("Please check your name, email and card details.");
        return;
      }
      move(2);
    }
  }
  async function choosePhotos(e) {
    const input = e.target;
    const selected = Array.from(input.files || []);
    input.value = "";
    if (!selected.length || preparing) return;
    setError("");
    setErrorField("");
    if (photos.length + selected.length > 8) {
      setError("You can add up to 8 photos. Remove one before adding more.");
      return;
    }
    setPreparing(true);
    try {
      const prepared = [];
      for (const file of selected) prepared.push(await preparePhoto(file));
      setPhotos((current) => [...current, ...prepared]);
    } catch (err) {
      setError(
        err.message ||
          "We could not prepare that photo. Try another photo. Your previous photos are still attached.",
      );
    } finally {
      setPreparing(false);
    }
  }
  async function send(e) {
    e.preventDefault();
    if (busy || preparing) return;
    if (!photos.length) {
      move(0);
      setError(
        "Add at least one photo of your items before sending your request.",
      );
      return;
    }
    const parsed = submissionSchema.safeParse(draft);
    if (!parsed.success) {
      setError(
        "Please check your details and confirm permission to contact you.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      data.set("data", JSON.stringify(parsed.data));
      photos.forEach((p) => data.append("photos", p));
      const result = await requestJSON(
        "/api/submissions",
        {
          method: "POST",
          body: data,
        },
        "We could not send your request. Your details are still here; please try again.",
      );
      setReference(result.reference);
      try {
        localStorage.removeItem(KEY);
      } catch {}
    } catch (err) {
      setError(err.message || "Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  if (reference)
    return (
      <section
        className="panel request-success"
        aria-live="polite"
        ref={heading}
        tabIndex={-1}
      >
        <span className="eyebrow">REQUEST RECEIVED</span>
        <h2>Your request is with our team.</h2>
        <p>
          Your reference is <strong>{reference}</strong>. We’ll reply to{" "}
          <strong>{draft.email}</strong> with an offer or an update.
        </p>
        <p>
          Please wait for agreed shipping and payment details before sending any
          items.
        </p>
        <a className="button" href="/">
          Back to home
        </a>
      </section>
    );
  return (
    <>
      <div className="progress" aria-label="Request progress">
        {["Your items", "About you", "Review & send"].map((label, i) => (
          <span
            key={label}
            className={step === i ? "active" : ""}
            aria-current={step === i ? "step" : undefined}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>
      <h2 className="sr-only" ref={heading} tabIndex={-1}>
        {["Your items", "About you", "Review your request"][step]}
      </h2>
      {restored && (
        <p className="draft-notice" role="status">
          Your draft is restored.{" "}
          {photos.length
            ? "Your photos are attached for this visit."
            : "Add your photos again before continuing."}
        </p>
      )}
      <form ref={form} onSubmit={step < 2 ? next : send}>
        <fieldset disabled={busy} className="form-fields">
          {step === 0 && (
            <>
              {draft.cards.map((c, i) => (
                <section className="panel" key={i}>
                  <div className="card-heading">
                    <h2>Item {i + 1}</h2>
                    {draft.cards.length > 1 && (
                      <button
                        type="button"
                        className="plain-button"
                        onClick={() =>
                          update(
                            "cards",
                            draft.cards.filter((_, j) => j !== i),
                          )
                        }
                      >
                        Remove item {i + 1}
                      </button>
                    )}
                  </div>
                  <div className="field-grid">
                    <label className="field full">
                      Item type
                      <select
                        value={c.itemType || "Graded card"}
                        onChange={(e) => card(i, "itemType", e.target.value)}
                      >
                        {ITEM_TYPES.map((type) => (
                          <option key={type}>{type}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field full">
                      {c.itemType === "Sealed product"
                        ? "Product name & set"
                        : "Card name & set"}
                      <input
                        required
                        maxLength={180}
                        name={`item-${i}-name`}
                        aria-invalid={
                          errorField === `item-${i}-name` || undefined
                        }
                        aria-describedby={
                          errorField === `item-${i}-name`
                            ? "request-error"
                            : undefined
                        }
                        value={c.name}
                        onChange={(e) => card(i, "name", e.target.value)}
                        placeholder={
                          c.itemType === "Sealed product"
                            ? "e.g. Pokémon booster box · set name"
                            : "e.g. Charizard ex · Obsidian Flames · #223"
                        }
                      />
                    </label>
                    <label className="field">
                      Category
                      <select
                        name={`item-${i}-category`}
                        aria-invalid={
                          errorField === `item-${i}-category` || undefined
                        }
                        aria-describedby={
                          errorField === `item-${i}-category`
                            ? "request-error"
                            : undefined
                        }
                        value={c.category}
                        onChange={(e) => card(i, "category", e.target.value)}
                      >
                        {CATEGORIES.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                    {(!c.itemType || c.itemType === "Graded card") && (
                      <>
                        <label className="field">
                          Grading company
                          <select
                            name={`item-${i}-grader`}
                            aria-invalid={
                              errorField === `item-${i}-grader` || undefined
                            }
                            aria-describedby={
                              errorField === `item-${i}-grader`
                                ? "request-error"
                                : undefined
                            }
                            value={c.grader}
                            onChange={(e) => card(i, "grader", e.target.value)}
                          >
                            {GRADERS.map((v) => (
                              <option key={v}>{v}</option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          Grade
                          <input
                            required
                            maxLength={30}
                            name={`item-${i}-grade`}
                            aria-invalid={
                              errorField === `item-${i}-grade` || undefined
                            }
                            aria-describedby={
                              errorField === `item-${i}-grade`
                                ? "request-error"
                                : undefined
                            }
                            value={c.grade}
                            onChange={(e) => card(i, "grade", e.target.value)}
                            placeholder="e.g. 10 or 9.5"
                          />
                        </label>
                      </>
                    )}
                    <label className="field">
                      Quantity
                      <input
                        required
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="10000"
                        name={`item-${i}-quantity`}
                        aria-invalid={
                          errorField === `item-${i}-quantity` || undefined
                        }
                        aria-describedby={
                          errorField === `item-${i}-quantity`
                            ? "request-error"
                            : undefined
                        }
                        value={c.quantity}
                        onChange={(e) => card(i, "quantity", e.target.value)}
                      />
                    </label>
                    {(!c.itemType || c.itemType === "Graded card") && (
                      <label className="field">
                        <span>
                          Certification number <small>Optional</small>
                        </span>
                        <input
                          maxLength={80}
                          name={`item-${i}-cert`}
                          aria-invalid={
                            errorField === `item-${i}-cert` || undefined
                          }
                          aria-describedby={
                            errorField === `item-${i}-cert`
                              ? "request-error"
                              : undefined
                          }
                          value={c.cert}
                          onChange={(e) => card(i, "cert", e.target.value)}
                        />
                      </label>
                    )}
                    <label className="field">
                      <span>
                        Asking price per item (USD) <small>Optional</small>
                      </span>
                      <input
                        inputMode="decimal"
                        maxLength={20}
                        name={`item-${i}-asking`}
                        aria-invalid={
                          errorField === `item-${i}-asking` || undefined
                        }
                        aria-describedby={
                          errorField === `item-${i}-asking`
                            ? "request-error"
                            : undefined
                        }
                        value={c.asking}
                        onChange={(e) => card(i, "asking", e.target.value)}
                        placeholder="No price in mind? Leave blank."
                      />
                    </label>
                    {c.itemType && c.itemType !== "Graded card" && (
                      <label className="field full">
                        <span>
                          Condition notes <small>Optional</small>
                        </span>
                        <textarea
                          maxLength={500}
                          value={c.condition || ""}
                          onChange={(e) => card(i, "condition", e.target.value)}
                          placeholder={
                            c.itemType === "Sealed product"
                              ? "Tell us about the factory seal, packaging and any dents or tears."
                              : "Tell us about corners, edges, surface wear or damage."
                          }
                        />
                      </label>
                    )}
                  </div>
                </section>
              ))}
              <button
                type="button"
                className="button secondary"
                disabled={draft.cards.length >= 50}
                onClick={() => update("cards", [...draft.cards, emptyCard()])}
              >
                Add another item
              </button>
              <details className="csv-import">
                <summary>
                  Import a spreadsheet
                  <span aria-hidden="true">+</span>
                </summary>
                <p className="hint">
                  Use our{" "}
                  <a
                    className="text-link"
                    href="/card-import-template.csv"
                    download
                  >
                    CSV template
                  </a>
                  . Up to 50 rows. Imported items replace the current item list;
                  your contact details stay saved.
                </p>
                <label className="field">
                  Choose CSV file
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        if (file.size > 200000)
                          throw Error("Please keep the CSV below 200 KB.");
                        const cards = importCards(await file.text());
                        update("cards", cards);
                        setError("");
                      } catch (err) {
                        setError(err.message);
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
                <br />
              </details>
              <section className="panel">
                <h2>Your asking price</h2>
                <label className="field">
                  <span>
                    Total asking price (USD) <small>Optional</small>
                  </span>
                  <input
                    inputMode="decimal"
                    maxLength={20}
                    name="askingTotal"
                    aria-invalid={errorField === "askingTotal" || undefined}
                    aria-describedby={
                      errorField === "askingTotal" ? "request-error" : undefined
                    }
                    value={draft.askingTotal}
                    onChange={(e) => update("askingTotal", e.target.value)}
                    placeholder="e.g. 500.00"
                    aria-describedby="asking-total-help"
                  />
                  <small id="asking-total-help">
                    Your target for the whole request, not an extra charge.
                    Leave blank if you’re open to an offer.
                  </small>
                </label>
              </section>
              <section className="panel">
                <h2>Item photos</h2>
                <p>
                  Add clear front and back photos, or show the packaging and
                  factory seals.
                </p>
                <div className="photo-upload-actions">
                  <button
                    name="add-photo"
                    className="button"
                    type="button"
                    disabled={preparing || photos.length >= 8}
                    onClick={() => camera.current?.click()}
                  >
                    Take a photo
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    disabled={preparing || photos.length >= 8}
                    onClick={() => files.current?.click()}
                  >
                    Choose photos
                  </button>
                  <input
                    ref={files}
                    hidden
                    aria-label="Choose photos"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                    onChange={choosePhotos}
                    disabled={preparing}
                  />
                  <input
                    ref={camera}
                    hidden
                    aria-label="Take a photo"
                    type="file"
                    capture="environment"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                    onChange={choosePhotos}
                    disabled={preparing}
                  />
                </div>
                <p className="hint">
                  Add 1–8 photos. JPG, PNG, WebP and iPhone HEIC supported.
                  Photos stay attached until you leave or reload.
                </p>
                {preparing && (
                  <p className="hint" role="status">
                    Preparing your photos…
                  </p>
                )}
                {photos.length > 0 && (
                  <div className="attached-photos">
                    <p className="hint" role="status">
                      {photos.length} of 8 photos added
                    </p>
                    <ul>
                      {photos.map((photo, i) => (
                        <li key={`${photo.name}-${i}`}>
                          <span>
                            Photo {i + 1}
                            <small>{photo.name}</small>
                          </span>
                          <button
                            type="button"
                            className="plain-button"
                            disabled={preparing}
                            aria-label={`Remove photo ${i + 1}`}
                            onClick={() =>
                              setPhotos((current) =>
                                current.filter((_, index) => index !== i),
                              )
                            }
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
              <p className="hint">
                Large collection? Add representative items and describe the rest
                in your notes on the next step.
              </p>
            </>
          )}
          {step === 1 && (
            <section className="panel">
              <h2>Where should we send your offer?</h2>
              <div className="field-grid">
                <label className="field full">
                  Your name
                  <input
                    required
                    autoComplete="name"
                    minLength={2}
                    maxLength={120}
                    value={draft.name}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </label>
                <label className="field full">
                  Email address
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    maxLength={254}
                    value={draft.email}
                    onChange={(e) => update("email", e.target.value)}
                  />
                  <small>Our team will use this address to contact you.</small>
                </label>
                <label className="field full">
                  <span>
                    Phone number <small>Optional</small>
                  </span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    maxLength={40}
                    value={draft.phone}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                </label>
                <label className="field full">
                  <span>
                    Anything else we should know? <small>Optional</small>
                  </span>
                  <textarea
                    maxLength={4000}
                    value={draft.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder="Collection details, condition, or questions for our team."
                  />
                </label>
              </div>
            </section>
          )}
          {step === 2 && (
            <>
              <section className="panel">
                <div className="card-heading">
                  <h2>Your items</h2>
                  <button
                    type="button"
                    className="plain-button"
                    onClick={() => move(0)}
                  >
                    Edit items
                  </button>
                </div>
                {draft.cards.map((c, i) => (
                  <div className="review-row" key={i}>
                    <div>
                      <strong>{c.name}</strong>
                      <br />
                      <span>
                        {c.category} · {itemDetails(c)} · Qty {c.quantity}
                        {(!c.itemType || c.itemType === "Graded card") &&
                          c.cert &&
                          ` · Cert ${c.cert}`}
                      </span>
                    </div>
                    <span>
                      {c.asking
                        ? `$${Number(c.asking).toFixed(2)} each`
                        : "Open to an offer"}
                    </span>
                  </div>
                ))}
                <p className="asking-total">
                  <strong>Your total asking price:</strong>{" "}
                  {draft.askingTotal
                    ? `$${Number(draft.askingTotal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "Open to an offer"}
                </p>
                <p className="hint">
                  {photos.length} photo{photos.length === 1 ? "" : "s"}{" "}
                  attached.
                </p>
              </section>
              <section className="panel">
                <div className="card-heading">
                  <h2>Contact details</h2>
                  <button
                    type="button"
                    className="plain-button"
                    onClick={() => move(1)}
                  >
                    Edit contact
                  </button>
                </div>
                <p>
                  <strong>{draft.name}</strong>
                  <br />
                  {draft.email}
                  {draft.phone && (
                    <>
                      <br />
                      {draft.phone}
                    </>
                  )}
                </p>
                {draft.notes && (
                  <p style={{ whiteSpace: "pre-wrap" }}>{draft.notes}</p>
                )}
              </section>
              <label className="check-label">
                <input
                  required
                  type="checkbox"
                  checked={draft.consent}
                  onChange={(e) => update("consent", e.target.checked)}
                />
                <span>
                  I give SellMySlabs permission to review these details and
                  contact me about this request. I’ve read the{" "}
                  <a className="text-link" href="/privacy" target="_blank">
                    privacy notice
                  </a>
                  .
                </span>
              </label>
              <p className="hint">
                Submitting does not commit you to a sale. Please agree all
                shipping and payment details with our team first.
              </p>
            </>
          )}
          <div style={{ display: "none" }} aria-hidden="true">
            <label>
              Website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={draft.website}
                onChange={(e) => update("website", e.target.value)}
              />
            </label>
          </div>
          {error && (
            <div
              ref={errorSummary}
              id="request-error"
              tabIndex={-1}
              className="error"
              role="alert"
            >
              <p>{error}</p>
              {errorField && (
                <button
                  type="button"
                  className="plain-button"
                  onClick={() =>
                    form.current?.elements.namedItem(errorField)?.focus()
                  }
                >
                  Go to the field
                </button>
              )}
            </div>
          )}
          <div className="form-actions">
            {step > 0 ? (
              <button
                className="button quiet"
                type="button"
                disabled={busy}
                onClick={() => move(step - 1)}
              >
                Back
              </button>
            ) : (
              <span />
            )}
            <button
              className="button"
              disabled={busy || preparing || !ready}
              type="submit"
            >
              {busy
                ? "Sending your request…"
                : step === 0
                  ? "Continue"
                  : step === 1
                    ? "Review my request"
                    : "Send my request"}
            </button>
          </div>
        </fieldset>
      </form>
      <p className="hint draft-status">
        {draftAvailable
          ? "Details saved in this browser. Photos are not saved."
          : "This browser cannot save your draft. Keep this page open until you send it."}{" "}
        <button
          type="button"
          className="plain-button"
          disabled={busy || preparing}
          onClick={() => {
            if (
              (hasDraftContent(draft) || photos.length) &&
              !window.confirm(
                "Clear all request details and attached photos? This cannot be undone.",
              )
            )
              return;
            setRestored(false);
            setDraft({ ...emptyDraft(), id: crypto.randomUUID() });
            setPhotos([]);
            if (files.current) files.current.value = "";
            move(0);
          }}
        >
          Clear draft
        </button>
      </p>
    </>
  );
}
