"use client";
import { useRef, useState } from "react";
import { preparePhoto, photoPreview, photoWarnings } from "../../../lib/prepare-photo";
import { requestJSON } from "../../../lib/request-json";
import styles from "./Retake.module.css";

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

export default function RetakeForm({ token, retake }) {
  const [photos, setPhotos] = useState(retake.photos);
  const [busy, setBusy] = useState(null);
  const [errors, setErrors] = useState({});
  const [notes, setNotes] = useState({});
  const [previews, setPreviews] = useState({});
  const input = useRef(null);
  const target = useRef(null);
  const remaining = photos.filter((photo) => !photo.done).length;

  async function choose(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    const index = target.current;
    if (!file || busy !== null || index === null) return;
    setBusy(index);
    setErrors((current) => ({ ...current, [index]: "" }));
    try {
      // The same checks as a new request: a blurry, dark or tiny photo is
      // refused here, before it is sent.
      const prepared = await preparePhoto(file);
      const body = new FormData();
      body.set("index", String(index));
      body.set("photo", prepared);
      body.set("preview", photoPreview(prepared), "preview.jpg");
      const result = await requestJSON(
        `/api/retake/${token}`,
        { method: "POST", body },
        "This photo could not upload. Please try again.",
      );
      setPhotos(result.photos);
      setNotes((current) => ({
        ...current,
        [index]: photoWarnings(prepared).join(" "),
      }));
      setPreviews((current) => {
        if (current[index]) URL.revokeObjectURL(current[index]);
        return {
          ...current,
          [index]: URL.createObjectURL(photoPreview(prepared)),
        };
      });
    } catch (failure) {
      setErrors((current) => ({
        ...current,
        [index]: failure.message || "Please try again.",
      }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.root}>
      <span className="eyebrow">REQUEST {retake.reference}</span>
      <h1>
        {remaining
          ? "We need a clearer photo."
          : "Thank you. Your new photos are with our team."}
      </h1>
      <p>
        {remaining
          ? `Hi ${retake.sellerName}. Add a new photo for each item below so we can finish reviewing your request.`
          : "We’ll continue reviewing your request and be in touch. You can replace a photo again while this link is active."}
      </p>
      {retake.note && (
        <p className={styles.note}>
          <strong>Note from our team:</strong> {retake.note}
        </p>
      )}
      <ul className={styles.tips} aria-label="Photo tips">
        <li>
          <strong>Fill the frame.</strong> One item, close enough to read the
          label.
        </li>
        <li>
          <strong>Bright, even light.</strong> No flash. Tilt away from glare.
        </li>
        <li>
          <strong>Hold steady.</strong> Tap the label to focus.
        </li>
      </ul>
      <ul className={styles.list}>
        {photos.map((photo) => (
          <li key={photo.index} className={styles.item}>
            <div className={styles.thumb}>
              {previews[photo.index] ? (
                <img
                  src={previews[photo.index]}
                  alt={`Your new photo for ${photo.label}`}
                />
              ) : (
                <span aria-hidden="true">{photo.done ? "✓" : "?"}</span>
              )}
            </div>
            <div className={styles.detail}>
              <strong>{photo.label}</strong>
              {photo.item && <span>{photo.item}</span>}
              <span
                className={photo.done ? styles.done : styles.pending}
                role="status"
              >
                {busy === photo.index
                  ? "Checking and uploading…"
                  : photo.done
                    ? "New photo received"
                    : "New photo needed"}
              </span>
              {errors[photo.index] && (
                <p className={styles.error} role="alert">
                  {errors[photo.index]}
                </p>
              )}
              {notes[photo.index] && !errors[photo.index] && (
                <p className={styles.warning}>{notes[photo.index]}</p>
              )}
            </div>
            <button
              type="button"
              className={photo.done ? "button secondary small" : "button small"}
              disabled={busy !== null}
              onClick={() => {
                target.current = photo.index;
                input.current?.click();
              }}
            >
              {photo.done ? "Replace again" : "Add new photo"}
            </button>
          </li>
        ))}
      </ul>
      <input
        ref={input}
        hidden
        type="file"
        aria-label="Choose a new photo"
        accept={ACCEPT}
        onChange={choose}
      />
      <p className="hint">
        Photos upload privately. Your earlier photo stays on file with our
        team.
      </p>
    </div>
  );
}
