"use client";
import { useEffect, useRef, useState } from "react";
import { GRADERS, CATEGORIES, ITEM_TYPES, itemDetails } from "../../lib/site";
import { submissionSchema } from "../../lib/validation";
import { stepErrors } from "../../lib/sell-validation";
import {
  loadDraftPhotos,
  saveDraftPhoto,
  removeDraftPhoto,
  clearDraftPhotos,
} from "../../lib/draft-photos";
import { uploadPhoto } from "../../lib/upload-photo";
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
import { Field, PhotoList } from "./SellFields";
import styles from "./SellForm.module.css";
import useAccountDraft from "./useAccountDraft";
import AccountDraftStatus from "./AccountDraftStatus";
import ResumeDraft from "../components/ResumeDraft";
import InspectionNotice from "../components/InspectionNotice";
import {
  MAX_SUBMISSION_PHOTOS,
  prepareSelection,
} from "../../lib/photo-selection";

const stages = ["Your items", "Contact", "Review"];
const titles = [
  "What would you like to sell?",
  "Where should we send your offer?",
  "Review your request.",
];
const descriptions = [
  "Add your items and photos. There’s no obligation to sell.",
  "We’ll email you with an offer or an update.",
  "Check your items, photos and contact details before sending.",
];

export default function SellForm() {
  const [draft, setDraft] = useState(emptyDraft);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [photoStorageAvailable, setPhotoStorageAvailable] = useState(true);
  const [draftNotice, setDraftNotice] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(null);
  const preparingLock = useRef(false);
  const [expandedItem, setExpandedItem] = useState(0);
  const [importing, setImporting] = useState(false);
  const [reference, setReference] = useState("");
  const [restored, setRestored] = useState(false);
  const [draftAvailable, setDraftAvailable] = useState(true);
  const form = useRef(null);
  const heading = useRef(null);
  const errorSummary = useRef(null);
  const focusInvalid = useRef(false);
  const files = useRef(null);
  const camera = useRef(null);
  const account = useAccountDraft({
    draft,
    photos,
    ready,
    done: !!reference,
    paused: busy || savingPhotos || preparing || importing,
    onRestore: (data, loaded, expired) => {
      setDraft(data);
      setPhotos(loaded);
      setRestored(true);
      setStep(0);
      setErrors({});
      setError("");
      setDraftNotice(
        expired
          ? `${expired} saved photo${expired === 1 ? " has" : "s have"} expired. Please add ${expired === 1 ? "it" : "them"} again.`
          : "",
      );
    },
  });
  const working =
    (account.saving && !account.active) ||
    busy ||
    preparing ||
    importing ||
    savingPhotos ||
    account.loading ||
    account.blocked;
  const photosSaved =
    account.active ||
    (photoStorageAvailable && photos.every((photo) => photo.persisted));
  useUnsavedChanges(
    !reference &&
      (account.dirty ||
        account.saving ||
        (!photosSaved && photos.length > 0) ||
        busy ||
        preparing ||
        importing ||
        savingPhotos ||
        (!account.active && !draftAvailable && hasDraftContent(draft))),
  );

  useEffect(() => {
    let active = true;
    async function restore() {
      const requested = new URLSearchParams(window.location.search).get(
        "draft",
      );
      if (requested) {
        setDraft({ ...emptyDraft(), id: requested });
        setReady(true);
        return;
      }
      let saved;
      try {
        saved = restoreDraft(localStorage.getItem(KEY), () =>
          crypto.randomUUID(),
        );
      } catch {
        saved = { ...emptyDraft(), id: crypto.randomUUID() };
        if (active) setDraftAvailable(false);
      }
      if (!active) return;
      setDraft(saved);
      setRestored(hasDraftContent(saved));
      try {
        const result = await loadDraftPhotos(saved.id);
        if (!active) return;
        setPhotos(result.photos);
        if (result.photos.length) setRestored(true);
        if (result.expired)
          setDraftNotice(
            `${result.expired} saved photo${result.expired === 1 ? " is" : "s are"} expired or unavailable. Your item details are still here; please add those photos again.`,
          );
      } catch {
        if (active) setPhotoStorageAvailable(false);
      }
      if (active) setReady(true);
    }
    restore();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (
      !ready ||
      reference ||
      account.active ||
      account.loading ||
      account.blocked
    )
      return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...draft, consent: false }));
      setDraftAvailable(true);
    } catch {
      setDraftAvailable(false);
    }
  }, [
    draft,
    ready,
    reference,
    account.active,
    account.loading,
    account.blocked,
  ]);
  useEffect(() => {
    if (focusInvalid.current) {
      focusInvalid.current = false;
      const name = Object.keys(errors)[0];
      const input = form.current?.querySelector(`[name="${name}"]`);
      const details = input?.closest("details");
      if (details) details.open = true;
      input?.focus();
    }
  }, [errors, step]);
  useEffect(() => {
    if (error) errorSummary.current?.focus();
  }, [error]);
  useEffect(() => {
    if (reference) heading.current?.focus();
  }, [reference]);

  function clearError(key) {
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setError("");
  }
  function update(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
    clearError(key);
  }
  function card(index, key, value) {
    setDraft((d) => ({
      ...d,
      cards: d.cards.map((c, i) => (i === index ? { ...c, [key]: value } : c)),
    }));
    if (key === "itemType")
      setErrors((current) =>
        Object.fromEntries(
          Object.entries(current).filter(
            ([name]) => !name.startsWith(`item-${index}-`),
          ),
        ),
      );
    else clearError(`item-${index}-${key}`);
  }
  function move(next) {
    setStep(next);
    setErrors({});
    setError("");
    requestAnimationFrame(() => heading.current?.focus());
  }
  function validate(stage) {
    const next = stepErrors(draft, photos.length, stage);
    if (!Object.keys(next).length) return true;
    focusInvalid.current = true;
    setStep(stage);
    const invalidItem = Object.keys(next)[0]?.match(/^item-(\d+)-/);
    if (invalidItem) setExpandedItem(Number(invalidItem[1]));
    setErrors(next);
    setError("");
    return false;
  }
  function props(name, hint = false) {
    return {
      id: name,
      name,
      "aria-invalid": errors[name] ? true : undefined,
      "aria-describedby":
        [hint && `${name}-hint`, errors[name] && `${name}-error`]
          .filter(Boolean)
          .join(" ") || undefined,
    };
  }
  async function choosePhotos(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length || working || preparingLock.current) return;
    setError("");
    preparingLock.current = true;
    setPreparing(true);
    try {
      const result = await prepareSelection(
        selected,
        MAX_SUBMISSION_PHOTOS - photos.length,
        (file) => uploadPhoto(file, draft.id),
        async (photo) => {
          let persisted = false;
          try {
            if (!account.active) await saveDraftPhoto(draft.id, photo);
            persisted = true;
            setPhotoStorageAvailable(true);
          } catch {
            setPhotoStorageAvailable(false);
          }
          setPhotos((current) => [...current, { ...photo, persisted }]);
        },
        setPhotoProgress,
      );
      if (result.added) clearError("photos");
      const messages = [...result.failures];
      if (result.skipped)
        messages.push(
          `Your request has room for ${MAX_SUBMISSION_PHOTOS} photos. ${result.skipped} extra photo${result.skipped === 1 ? " was" : "s were"} not added. Use clear group photos for a larger collection.`,
        );
      if (messages.length)
        setError(messages.join(" ") + " Your added photos are still attached.");
    } finally {
      preparingLock.current = false;
      setPreparing(false);
      setPhotoProgress(null);
    }
  }
  async function chooseCSV(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || working) return;
    setImporting(true);
    try {
      if (file.size > 200000) throw Error("Please keep the CSV below 200 KB.");
      const items = importCards(await file.text());
      update("cards", items);
      setExpandedItem(0);
      setErrors({});
    } catch (failure) {
      setError(failure.message);
    } finally {
      setImporting(false);
    }
  }
  async function submit(event) {
    event.preventDefault();
    if (working || !ready) return;
    if (step < 2) {
      if (validate(step)) move(step + 1);
      return;
    }
    for (const stage of [0, 1, 2]) if (!validate(stage)) return;
    const parsed = submissionSchema.safeParse(draft);
    if (!parsed.success) {
      setError("Please check your details before sending your request.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const revision =
        account.active || account.user ? await account.save() : null;
      const data = new FormData();
      data.set("data", JSON.stringify(parsed.data));
      if (revision) data.set("draftVersion", String(revision));
      data.set("uploads", JSON.stringify(photos.map((photo) => photo.token)));
      const result = await requestJSON(
        "/api/submissions",
        { method: "POST", body: data },
        "We could not send your request. Your details are still here; please try again.",
      );
      account.finish();
      setReference(result.reference);
      setPhotos([]);
      await clearDraftPhotos(draft.id).catch(() => {});
      try {
        localStorage.removeItem(KEY);
      } catch {}
    } catch (failure) {
      setError(
        failure.message || "Please check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (reference)
    return (
      <div className={styles.root}>
        <header className={styles.intro}>
          <span className="eyebrow">REQUEST RECEIVED</span>
          <h1 ref={heading} tabIndex={-1}>
            Your request is with our team.
          </h1>
        </header>
        <InspectionNotice />
        <section className={styles.success} aria-live="polite">
          <p>
            We’ll reply to <strong>{draft.email}</strong> with an offer or an
            update.
          </p>
          <p>
            Your reference: <strong>{reference}</strong>
          </p>
          <p>
            Please wait for an accepted offer and confirmed shipping details
            before sending any items.
          </p>
          <h2>Keep track of your request.</h2>
          <p>
            Create an account or sign in with the same email to see your
            requests, offers and shipping progress. It’s optional—we’ll still
            email you.
          </p>
          <a className="button" href="/account">
            Track your request
          </a>
          <a className="plain-button" href="/">
            Back to home
          </a>
        </section>
      </div>
    );

  return (
    <div className={styles.root}>
      <header className={styles.intro}>
        <span className="eyebrow">REQUEST AN OFFER</span>
        <h1 ref={heading} tabIndex={-1}>
          {titles[step]}
        </h1>
        <p>{descriptions[step]}</p>
      </header>
      {ready && account.resumeDraft && (
        <ResumeDraft
          draft={account.resumeDraft}
          otherCount={account.savedDraftCount - 1}
        />
      )}
      <InspectionNotice />
      {ready && !account.resumeDraft && (
        <AccountDraftStatus account={account} disabled={working} />
      )}
      <ol className={styles.progress} aria-label="Request progress">
        {stages.map((label, index) => (
          <li
            key={label}
            className={index <= step ? styles.reached : ""}
            aria-current={index === step ? "step" : undefined}
          >
            <span>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {step < 2 && (
        <p className={styles.hint}>
          All fields are required unless marked optional.
        </p>
      )}
      {restored && step === 0 && (
        <p className={styles.draftNotice} role="status">
          {photos.length
            ? `Your draft and ${photos.length} photo${photos.length === 1 ? "" : "s"} are restored.`
            : "Your draft is restored."}
        </p>
      )}
      {draftNotice && (
        <p className={styles.draftNotice} role="status">
          {draftNotice}
        </p>
      )}
      {!ready && (
        <p className={styles.hint} role="status">
          Restoring your draft…
        </p>
      )}
      {ready && !photosSaved && (
        <p className={styles.draftNotice} role="alert">
          This browser couldn’t save all your photo previews. Keep this page
          open until you send your request.
        </p>
      )}
      <form ref={form} onSubmit={submit} noValidate aria-busy={working}>
        <fieldset className="form-fields" disabled={working || !ready}>
          {step === 0 && (
            <>
              {draft.cards.map((c, index) => {
                const key = (field) => `item-${index}-${field}`;
                const graded = c.itemType === "Graded card";
                return (
                  <section
                    className={styles.item}
                    key={index}
                    aria-labelledby={`item-${index}-heading`}
                  >
                    <div className={styles.sectionHeading}>
                      <h2 id={`item-${index}-heading`}>
                        <button
                          type="button"
                          className={styles.itemToggle}
                          aria-expanded={expandedItem === index}
                          aria-controls={`item-${index}-details`}
                          onClick={() =>
                            setExpandedItem(
                              expandedItem === index ? null : index,
                            )
                          }
                        >
                          <span>
                            Item {index + 1}
                            {c.name ? ` · ${c.name}` : ""}
                          </span>
                          <span aria-hidden="true">
                            {expandedItem === index ? "−" : "+"}
                          </span>
                        </button>
                      </h2>
                      {draft.cards.length > 1 && (
                        <button
                          type="button"
                          className="plain-button"
                          onClick={() => {
                            update(
                              "cards",
                              draft.cards.filter((_, i) => i !== index),
                            );
                            setExpandedItem(Math.max(0, index - 1));
                            setErrors({});
                          }}
                        >
                          Remove item {index + 1}
                        </button>
                      )}
                    </div>
                    <div
                      id={`item-${index}-details`}
                      hidden={expandedItem !== index}
                    >
                      <fieldset
                        className={styles.typeGroup}
                        aria-describedby={
                          errors[key("itemType")]
                            ? `${key("itemType")}-error`
                            : undefined
                        }
                      >
                        <legend>Item type</legend>
                        <div className={styles.typeChoices}>
                          {ITEM_TYPES.map((type, t) => (
                            <label key={type} className={styles.typeChoice}>
                              <input
                                {...props(key("itemType"))}
                                id={`${key("itemType")}-${t}`}
                                className="sr-only"
                                type="radio"
                                required
                                checked={c.itemType === type}
                                value={type}
                                onChange={() => card(index, "itemType", type)}
                              />
                              <span>{type}</span>
                            </label>
                          ))}
                        </div>
                        {errors[key("itemType")] && (
                          <p
                            id={`${key("itemType")}-error`}
                            className={styles.fieldError}
                          >
                            {errors[key("itemType")]}
                          </p>
                        )}
                      </fieldset>
                      {c.itemType && (
                        <>
                          <div className={styles.grid}>
                            <Field
                              id={key("name")}
                              label={
                                c.itemType === "Sealed product"
                                  ? "Product name & set"
                                  : "Card name & set"
                              }
                              error={errors[key("name")]}
                              full
                            >
                              <input
                                {...props(key("name"))}
                                required
                                minLength={2}
                                maxLength={180}
                                value={c.name}
                                onChange={(e) =>
                                  card(index, "name", e.target.value)
                                }
                                placeholder={
                                  c.itemType === "Sealed product"
                                    ? "e.g. Pokémon 151 booster bundle"
                                    : "e.g. Charizard ex · Obsidian Flames · #223"
                                }
                              />
                            </Field>
                            <Field
                              id={key("category")}
                              label="Category"
                              error={errors[key("category")]}
                            >
                              <select
                                {...props(key("category"))}
                                required
                                value={c.category}
                                onChange={(e) =>
                                  card(index, "category", e.target.value)
                                }
                              >
                                <option value="" disabled>
                                  Select…
                                </option>
                                {CATEGORIES.map((v) => (
                                  <option key={v}>{v}</option>
                                ))}
                              </select>
                            </Field>
                            <Field
                              id={key("quantity")}
                              label="Quantity"
                              error={errors[key("quantity")]}
                            >
                              <input
                                {...props(key("quantity"))}
                                required
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max="10000"
                                step="1"
                                value={c.quantity}
                                onChange={(e) =>
                                  card(index, "quantity", e.target.value)
                                }
                              />
                            </Field>
                            {graded && (
                              <>
                                <Field
                                  id={key("grader")}
                                  label="Grading company"
                                  error={errors[key("grader")]}
                                >
                                  <select
                                    {...props(key("grader"))}
                                    required
                                    value={c.grader}
                                    onChange={(e) =>
                                      card(index, "grader", e.target.value)
                                    }
                                  >
                                    <option value="" disabled>
                                      Select…
                                    </option>
                                    {GRADERS.map((v) => (
                                      <option key={v}>{v}</option>
                                    ))}
                                  </select>
                                </Field>
                                <Field
                                  id={key("grade")}
                                  label="Grade"
                                  error={errors[key("grade")]}
                                >
                                  <input
                                    {...props(key("grade"))}
                                    required
                                    maxLength={30}
                                    value={c.grade}
                                    onChange={(e) =>
                                      card(index, "grade", e.target.value)
                                    }
                                    placeholder="e.g. 10 or 9.5"
                                  />
                                </Field>
                              </>
                            )}
                            {!graded && (
                              <Field
                                id={key("condition")}
                                label="Condition notes"
                                optional
                                full
                                error={errors[key("condition")]}
                              >
                                <textarea
                                  {...props(key("condition"))}
                                  maxLength={500}
                                  value={c.condition}
                                  onChange={(e) =>
                                    card(index, "condition", e.target.value)
                                  }
                                  placeholder={
                                    c.itemType === "Sealed product"
                                      ? "Any dents, tears or damage to the seal?"
                                      : "Any wear, marks or damage?"
                                  }
                                />
                              </Field>
                            )}
                          </div>
                          <details className={styles.optionalDetails}>
                            <summary>
                              {graded
                                ? "Certification & item price"
                                : "Item asking price"}
                              <span className={styles.optional}>Optional</span>
                            </summary>
                            <div className={styles.grid}>
                              {graded && (
                                <Field
                                  id={key("cert")}
                                  label="Certification number"
                                  optional
                                  error={errors[key("cert")]}
                                >
                                  <input
                                    {...props(key("cert"))}
                                    maxLength={80}
                                    value={c.cert}
                                    onChange={(e) =>
                                      card(index, "cert", e.target.value)
                                    }
                                  />
                                </Field>
                              )}
                              <Field
                                id={key("asking")}
                                label="Asking price per item (USD)"
                                optional
                                error={errors[key("asking")]}
                              >
                                <input
                                  {...props(key("asking"))}
                                  inputMode="decimal"
                                  maxLength={20}
                                  value={c.asking}
                                  onChange={(e) =>
                                    card(index, "asking", e.target.value)
                                  }
                                  placeholder="e.g. 125.00"
                                />
                              </Field>
                            </div>
                          </details>
                        </>
                      )}
                    </div>
                  </section>
                );
              })}
              <div className={styles.itemActions}>
                <button
                  type="button"
                  className="button secondary"
                  disabled={draft.cards.length >= 50}
                  onClick={() => {
                    const index = draft.cards.length;
                    update("cards", [...draft.cards, emptyCard()]);
                    setExpandedItem(index);
                    requestAnimationFrame(() =>
                      form.current
                        ?.querySelector(`[name="item-${index}-itemType"]`)
                        ?.focus(),
                    );
                  }}
                >
                  Add another item
                </button>
                <details className={styles.import}>
                  <summary>Import a spreadsheet</summary>
                  <p className={styles.hint}>
                    Use our{" "}
                    <a
                      className="text-link"
                      href="/card-import-template.csv"
                      download
                    >
                      CSV template
                    </a>{" "}
                    for up to 50 items. Importing replaces your item list;
                    contact details and photos stay attached.
                  </p>
                  <Field id="csv" label="Choose CSV file" optional>
                    <input
                      id="csv"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={chooseCSV}
                    />
                  </Field>
                  {importing && (
                    <p role="status" className={styles.hint}>
                      Importing items…
                    </p>
                  )}
                </details>
              </div>
              <section
                className={styles.section}
                aria-labelledby="photos-heading"
              >
                <div className={styles.sectionHeading}>
                  <h2 id="photos-heading">Photos</h2>
                  <span className={styles.required}>At least 1 required</span>
                </div>
                <p>
                  Show the front and back of your cards, or the packaging and
                  seals. Keep labels in focus and avoid glare. You can attach up
                  to {MAX_SUBMISSION_PHOTOS} photos per request, so each slab
                  can have its own photo. Photos upload privately as you add
                  them.
                </p>
                <div className={styles.uploadActions}>
                  <button
                    {...props("photos")}
                    className="button secondary"
                    type="button"
                    disabled={photos.length >= MAX_SUBMISSION_PHOTOS}
                    onClick={() => files.current?.click()}
                  >
                    Choose photos
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    disabled={photos.length >= MAX_SUBMISSION_PHOTOS}
                    onClick={() => camera.current?.click()}
                  >
                    Take a photo
                  </button>
                  <input
                    ref={files}
                    hidden
                    type="file"
                    aria-label="Choose photo files"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                    onChange={choosePhotos}
                  />
                  <input
                    ref={camera}
                    hidden
                    type="file"
                    aria-label="Take a new photo"
                    capture="environment"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                    onChange={choosePhotos}
                  />
                </div>
                {errors.photos && (
                  <p id="photos-error" className={styles.fieldError}>
                    {errors.photos}
                  </p>
                )}
                <p className={styles.hint} role="status">
                  {preparing
                    ? `Uploading photo ${photoProgress?.current || 1} of ${photoProgress?.total || 1}…`
                    : `${photos.length} of ${MAX_SUBMISSION_PHOTOS} photos uploaded. JPG, PNG, WebP or iPhone HEIC.`}
                </p>
                {!!photos.length && (
                  <PhotoList
                    photos={photos}
                    disabled={working}
                    onRemove={async (index) => {
                      if (working || preparingLock.current) return;
                      preparingLock.current = true;
                      setSavingPhotos(true);
                      try {
                        if (!account.active && photos[index].persisted)
                          await removeDraftPhoto(draft.id, photos[index].token);
                        setPhotos((current) =>
                          current.filter((_, i) => i !== index),
                        );
                      } catch {
                        setError(
                          "This saved photo couldn’t be removed. Please try again.",
                        );
                      } finally {
                        preparingLock.current = false;
                        setSavingPhotos(false);
                      }
                    }}
                  />
                )}
              </section>
              <section
                className={styles.section}
                aria-labelledby="asking-heading"
              >
                <h2 id="asking-heading">Have a price in mind?</h2>
                <Field
                  id="askingTotal"
                  label="Total asking price (USD)"
                  optional
                  hint="Your target for the whole collection. Leave blank if you’re open to an offer."
                  error={errors.askingTotal}
                >
                  <input
                    {...props("askingTotal", true)}
                    inputMode="decimal"
                    maxLength={20}
                    value={draft.askingTotal}
                    onChange={(e) => update("askingTotal", e.target.value)}
                    placeholder="e.g. 500.00"
                  />
                </Field>
              </section>
              <p className={styles.hint}>
                Large collection? Add representative items and describe the rest
                in your notes on the next step.
              </p>
            </>
          )}
          {step === 1 && (
            <div className={styles.contact}>
              <Field id="name" label="Your name" error={errors.name}>
                <input
                  {...props("name")}
                  required
                  autoComplete="name"
                  minLength={2}
                  maxLength={120}
                  value={draft.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </Field>
              <Field
                id="email"
                label="Email address"
                hint="Your offer will go to this address."
                error={errors.email}
              >
                <input
                  {...props("email", true)}
                  required
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={254}
                  value={draft.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </Field>
              <Field
                id="phone"
                label="Phone number"
                optional
                error={errors.phone}
              >
                <input
                  {...props("phone")}
                  type="tel"
                  autoComplete="tel"
                  maxLength={40}
                  value={draft.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </Field>
              <Field
                id="notes"
                label="Anything else we should know?"
                optional
                error={errors.notes}
              >
                <textarea
                  {...props("notes")}
                  maxLength={4000}
                  value={draft.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Collection details, condition or questions."
                />
              </Field>
            </div>
          )}
          {step === 2 && (
            <>
              <section className={styles.section}>
                <div className={styles.sectionHeading}>
                  <h2>Your items</h2>
                  <button
                    className="plain-button"
                    type="button"
                    onClick={() => move(0)}
                  >
                    Edit items
                  </button>
                </div>
                <ul className={styles.reviewItems}>
                  {draft.cards.map((c, index) => (
                    <li key={index}>
                      <strong>{c.name}</strong>
                      <span>
                        {c.category} · {itemDetails(c)} · Qty {c.quantity}
                        {c.itemType === "Graded card" && c.cert
                          ? ` · Cert ${c.cert}`
                          : ""}
                      </span>
                      {c.asking && (
                        <span>Asking ${Number(c.asking).toFixed(2)} each</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className={styles.total}>
                  <span>Total asking price</span>
                  <strong>
                    {draft.askingTotal
                      ? `$${Number(draft.askingTotal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "Open to an offer"}
                  </strong>
                </p>
                <h3>
                  {photos.length} photo{photos.length === 1 ? "" : "s"} attached
                </h3>
                <PhotoList photos={photos} />
              </section>
              <section className={styles.section}>
                <div className={styles.sectionHeading}>
                  <h2>Contact details</h2>
                  <button
                    type="button"
                    className="plain-button"
                    onClick={() => move(1)}
                  >
                    Edit contact
                  </button>
                </div>
                <p className={styles.contactReview}>
                  <strong>{draft.name}</strong>
                  <span>{draft.email}</span>
                  {draft.phone && <span>{draft.phone}</span>}
                </p>
                {draft.notes && <p className={styles.notes}>{draft.notes}</p>}
              </section>
              <label className={styles.consent}>
                <input
                  {...props("consent")}
                  required
                  type="checkbox"
                  checked={draft.consent}
                  onChange={(e) => update("consent", e.target.checked)}
                />
                <span>
                  I give SellMySlabs permission to review these details and
                  contact me about this request. I’ve read the{" "}
                  <a
                    className="text-link"
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    privacy notice
                  </a>
                  .
                </span>
              </label>
              {errors.consent && (
                <p id="consent-error" className={styles.fieldError}>
                  {errors.consent}
                </p>
              )}
              <p className={styles.hint}>
                This is a request for an offer, not an agreement to sell. Please
                wait for an accepted offer and confirmed shipping details before
                sending items.
              </p>
            </>
          )}
          <div hidden aria-hidden="true">
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
              className="error"
              role="alert"
              tabIndex={-1}
            >
              {error}
            </div>
          )}
          {Object.keys(errors).length > 0 && (
            <p className={styles.fieldError} role="alert">
              Check the highlighted fields before continuing.
            </p>
          )}
          <div className={styles.actions}>
            {step > 0 && (
              <button
                className="button quiet"
                type="button"
                onClick={() => move(step - 1)}
              >
                Back
              </button>
            )}
            <button className="button" type="submit">
              {busy
                ? "Sending your request…"
                : step === 0
                  ? "Continue to contact"
                  : step === 1
                    ? "Review my request"
                    : "Send my request"}
            </button>
          </div>
        </fieldset>
      </form>
      <div className={styles.draftStatus}>
        <p className={styles.hint}>
          {account.active
            ? "Your account draft keeps your items, contact details and uploaded photos together."
            : draftAvailable && photosSaved
              ? "Your details and uploaded photos are saved on this device. Return in the same browser to continue. Photos are kept for 30 days from upload."
              : "This browser cannot save your full draft. Keep this page open until you send it."}
        </p>
        <button
          type="button"
          className="plain-button"
          disabled={working || !ready}
          onClick={async () => {
            if (
              (hasDraftContent(draft) || photos.length) &&
              !window.confirm(
                "Clear all request details and attached photos? This cannot be undone.",
              )
            )
              return;
            setSavingPhotos(true);
            try {
              if (account.active) {
                await account.clear();
                await clearDraftPhotos(draft.id).catch(() => {});
              } else await clearDraftPhotos(draft.id);
            } catch (failure) {
              if (account.active || photos.some((photo) => photo.persisted)) {
                setError(
                  failure.message ||
                    "Your saved photos couldn’t be cleared. Please try again.",
                );
                setSavingPhotos(false);
                return;
              }
            }
            try {
              localStorage.removeItem(KEY);
            } catch {}
            setSavingPhotos(false);
            setDraftNotice("");
            setRestored(false);
            setDraft({ ...emptyDraft(), id: crypto.randomUUID() });
            setPhotos([]);
            setExpandedItem(0);
            move(0);
          }}
        >
          Clear draft
        </button>
      </div>
    </div>
  );
}
