"use client";
import { useEffect, useRef, useState } from "react";
import { GRADERS, CATEGORIES, BUSINESS, ITEM_TYPES, itemDetails } from "../../lib/site";
import { submissionSchema, cardSchema, askingTotalSchema } from "../../lib/validation";
import { preparePhoto } from "../../lib/prepare-photo";
import { importCards } from "../../lib/import-cards";
const emptyCard = () => ({
  itemType: "Graded card",
  condition: "",
  name: "",
  category: "Pokémon",
  grader: "PSA",
  grade: "",
  cert: "",
  quantity: 1,
  asking: "",
});
const emptyDraft = () => ({
  id: "",
  name: "",
  email: "",
  phone: "",
  notes: "",
  askingTotal: "",
  cards: [emptyCard()],
  consent: false,
  website: "",
});
const KEY = "sms-request-draft-v2";
export default function SellForm() {
  const [draft, setDraft] = useState(emptyDraft);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [preparing, setPreparing] = useState(false);
  const [reference, setReference] = useState("");
  const heading = useRef(null);
  const files = useRef(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (
        saved &&
        Array.isArray(saved.cards) &&
        saved.cards.length > 0 &&
        saved.cards.length <= 50
      )
        setDraft({ ...emptyDraft(), ...saved, consent: false, website: "" });
      else setDraft((d) => ({ ...d, id: crypto.randomUUID() }));
    } catch {
      setDraft((d) => ({ ...d, id: crypto.randomUUID() }));
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && !reference) {
      try {
        localStorage.setItem(KEY, JSON.stringify({ ...draft, consent: false }));
      } catch {}
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
    setTimeout(() => heading.current?.focus(), 0);
  }
  function next(e) {
    e.preventDefault();
    if (step === 0) {
      for (let i = 0; i < draft.cards.length; i++) {
        const result = cardSchema.safeParse(draft.cards[i]);
        if (!result.success) {
          setError(`Item ${i + 1}: ${result.error.issues[0].message}`);
          return;
        }
      }
      const total = askingTotalSchema.safeParse(draft.askingTotal);
      if (!total.success) { setError(total.error.issues[0].message); return; }
      if (!photos.length) { setError("Add at least one photo of your items before continuing."); return; }
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
    setPhotos([]); setError('');
    if (selected.length > 8) { setError('Choose up to 8 photos per request.'); input.value=''; return; }
    setPreparing(true);
    try {
      const prepared = [];
      for (const file of selected) prepared.push(await preparePhoto(file));
      setPhotos(prepared);
    } catch (err) { setError(err.message || 'We could not prepare that photo. Please try a JPG, PNG or WebP.'); input.value=''; }
    finally { setPreparing(false); }
  }
  async function send(e) {
    e.preventDefault();
    if (busy || preparing) return;
    if (!photos.length) { move(0); setError("Add at least one photo of your items before sending your request."); return; }
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
      const response = await fetch("/api/submissions", {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "We could not send your request.");
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
      <section className="panel" aria-live="polite">
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
      <form onSubmit={step < 2 ? next : send}>
        {step === 0 && (
          <>
            <details>
              <summary>
                Have a spreadsheet? Import your items
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
                    <select value={c.itemType || "Graded card"} onChange={(e) => card(i, "itemType", e.target.value)}>
                      {ITEM_TYPES.map((type) => <option key={type}>{type}</option>)}
                    </select>
                  </label>
                  <label className="field full">
                    {c.itemType === "Sealed product" ? "Product name & set" : "Card name & set"}
                    <input
                      required
                      maxLength={180}
                      value={c.name}
                      onChange={(e) => card(i, "name", e.target.value)}
                      placeholder={c.itemType === "Sealed product" ? "e.g. Pokémon booster box · set name" : "e.g. Charizard ex · Obsidian Flames · #223"}
                    />
                  </label>
                  <label className="field">
                    Category
                    <select
                      value={c.category}
                      onChange={(e) => card(i, "category", e.target.value)}
                    >
                      {CATEGORIES.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  {(!c.itemType || c.itemType === "Graded card") && <>
                  <label className="field">
                    Grading company
                    <select
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
                      value={c.grade}
                      onChange={(e) => card(i, "grade", e.target.value)}
                      placeholder="e.g. 10 or 9.5"
                    />
                  </label>
                  </>}
                  <label className="field">
                    Quantity
                    <input
                      required
                      type="number"
                      min="1"
                      max="10000"
                      value={c.quantity}
                      onChange={(e) => card(i, "quantity", e.target.value)}
                    />
                  </label>
                  {(!c.itemType || c.itemType === "Graded card") && <label className="field">
                    Certification number <small>Optional</small>
                    <input
                      maxLength={80}
                      value={c.cert}
                      onChange={(e) => card(i, "cert", e.target.value)}
                    />
                  </label>}
                  <label className="field">
                    Asking price per item (USD) <small>Optional</small>
                    <input
                      inputMode="decimal"
                      maxLength={20}
                      value={c.asking}
                      onChange={(e) => card(i, "asking", e.target.value)}
                      placeholder="No price in mind? Leave blank."
                    />
                  </label>
                  {c.itemType && c.itemType !== "Graded card" && <label className="field full">
                    Condition notes <small>Optional</small>
                    <textarea maxLength={500} value={c.condition || ""} onChange={(e) => card(i, "condition", e.target.value)}
                      placeholder={c.itemType === "Sealed product" ? "Tell us about the factory seal, packaging and any dents or tears." : "Tell us about corners, edges, surface wear or damage."} />
                  </label>}
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
            <section className="panel">
              <h2>What are you hoping to get?</h2>
              <label className="field">
                Total asking price (USD) <small>Optional</small>
                <input inputMode="decimal" maxLength={20} value={draft.askingTotal}
                  onChange={(e) => update("askingTotal", e.target.value)}
                  placeholder="e.g. 500.00" aria-describedby="asking-total-help" />
                <small id="asking-total-help">Your target for all items in this request combined. Leave blank if you’re open to an offer. This is not added to your per-item prices.</small>
              </label>
            </section>
            <section className="panel">
              <h2>Add photos of your items.</h2>
              <p>
                Include the front and back of cards, or the packaging and factory seals of sealed products. At least one photo is required to submit your request.
              </p>
              <label className="field">
                Choose photos (required)
                <input
                  ref={files}
                  required={photos.length === 0}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={choosePhotos}
                  disabled={preparing}
                />
                <small>
                  1–8 photos required. JPG, PNG or WebP. We resize them for a faster upload. Photos must be selected again if you leave this page.
                </small>
              </label>
              {preparing && <p className="hint" role="status">Preparing your photos…</p>}
              {photos.length > 0 && (
                <p className="hint">
                  {photos.length} photo{photos.length === 1 ? "" : "s"}{" "}
                  selected: {photos.map((p) => p.name).join(", ")}
                </p>
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
                Phone number <small>Optional</small>
                <input
                  type="tel"
                  autoComplete="tel"
                  maxLength={40}
                  value={draft.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </label>
              <label className="field full">
                Anything else we should know? <small>Optional</small>
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
                      {(!c.itemType || c.itemType === "Graded card") && c.cert && ` · Cert ${c.cert}`}
                    </span>
                  </div>
                  <span>
                    {c.asking
                      ? `$${Number(c.asking).toFixed(2)} each`
                      : "Open to an offer"}
                  </span>
                </div>
              ))}
              <p className="asking-total"><strong>Your total asking price:</strong>{" "}
                {draft.askingTotal ? `$${Number(draft.askingTotal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Open to an offer"}
              </p>
              <p className="hint">{photos.length} photos attached.</p>
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
          <div className="error" role="alert">
            {error}
            <br />
            <a href={BUSINESS.phoneHref}>Call {BUSINESS.phone}</a>
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
          <button className="button" disabled={busy || preparing || !ready} type="submit">
            {busy
              ? "Sending your request…"
              : step === 0
                ? "Continue"
                : step === 1
                  ? "Review my request"
                  : "Send my request"}
          </button>
        </div>
      </form>
      <p className="hint">
        Your draft is saved on this device.{" "}
        <button
          type="button"
          className="plain-button"
          onClick={() => {
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
