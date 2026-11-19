import { useEffect, useState } from "react";
import styles from "./SellForm.module.css";
import PhotoPager, { PHOTO_PAGE_SIZE } from "../components/PhotoPager";
import { photoPreview } from "../../lib/prepare-photo";
import { PHOTO_SIDES, labelText, slotPhoto } from "../../lib/photo-labels";

export function Field({
  id,
  label,
  optional,
  hint,
  error,
  children,
  full = false,
}) {
  return (
    <div className={`${styles.field} ${full ? styles.full : ""}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className={styles.optional}> Optional</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}

function usePhotoUrl(file) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    if (file.previewUrl) {
      setUrl(file.previewUrl);
      return;
    }
    const next = URL.createObjectURL(file.preview || photoPreview(file));
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

function Slot({ index, side, file, disabled, name, onAdd, onRemove }) {
  const url = usePhotoUrl(file);
  const title = side === "front" ? "Front" : "Back";
  return (
    <div className={styles.slot}>
      <div className={styles.slotImage}>
        {url ? (
          <img
            src={url}
            alt={`${title} of item ${index + 1}`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span aria-hidden="true">{title}</span>
        )}
      </div>
      <div className={styles.slotActions}>
        <strong>{title}</strong>
        <button
          type="button"
          className="plain-button"
          name={name}
          disabled={disabled}
          onClick={() => onAdd(side)}
        >
          {file ? "Replace" : `Add ${side} photo`}
        </button>
        {file && (
          <button
            type="button"
            className="plain-button"
            disabled={disabled}
            aria-label={`Remove ${side} photo of item ${index + 1}`}
            onClick={() => onRemove(file)}
          >
            Remove
          </button>
        )}
      </div>
      {!!file?.warnings?.length && (
        <p className={styles.photoWarning}>{file.warnings.join(" ")}</p>
      )}
    </div>
  );
}

// Front and back photo slots for one item.
export function ItemPhotos({
  index,
  photos,
  required,
  error,
  disabled,
  onAdd,
  onRemove,
}) {
  const id = `item-${index}-photos`;
  return (
    <div
      className={styles.itemPhotos}
      role="group"
      aria-labelledby={`${id}-label`}
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <p id={`${id}-label`} className={styles.itemPhotosLabel}>
        Photos of this item
        {!required && <span className={styles.optional}> Optional</span>}
      </p>
      <div className={styles.slots}>
        {PHOTO_SIDES.map((side, position) => (
          <Slot
            key={side}
            index={index}
            side={side}
            file={slotPhoto(photos, index, side)}
            disabled={disabled}
            name={position === 0 ? id : undefined}
            onAdd={(chosen) => onAdd(index, chosen)}
            onRemove={onRemove}
          />
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}

function Photo({ file, index, onRemove, disabled }) {
  const url = usePhotoUrl(file);
  const label = labelText(file);
  return (
    <li>
      <div className={styles.photoImage}>
        {url && (
          <img
            src={url}
            alt={`Your uploaded photo ${index + 1}`}
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
      <div className={styles.photoCaption}>
        <span>{label || `Photo ${index + 1}`}</span>
        {onRemove && (
          <button
            type="button"
            className="plain-button"
            disabled={disabled}
            aria-label={`Remove photo ${index + 1}`}
            onClick={() => onRemove(index)}
          >
            Remove
          </button>
        )}
      </div>
      {!!file.warnings?.length && (
        <p className={styles.photoWarning}>
          <strong>Check photo {index + 1}.</strong> {file.warnings.join(" ")}
          {onRemove && " Remove it and retake if needed."}
        </p>
      )}
    </li>
  );
}

export function PhotoList({ photos, onRemove, disabled }) {
  const [page, setPage] = useState(0);
  const current = Math.min(
    page,
    Math.max(0, Math.ceil(photos.length / PHOTO_PAGE_SIZE) - 1),
  );
  return (
    <>
      <ul className={styles.photoList} aria-label="Attached photos">
        {photos
          .slice(current * PHOTO_PAGE_SIZE, (current + 1) * PHOTO_PAGE_SIZE)
          .map((file, offset) => {
            const index = current * PHOTO_PAGE_SIZE + offset;
            return (
              <Photo
                key={file.token || `${file.name}-${file.lastModified}-${index}`}
                file={file}
                index={index}
                onRemove={onRemove}
                disabled={disabled}
              />
            );
          })}
      </ul>
      <PhotoPager page={current} total={photos.length} onChange={setPage} />
    </>
  );
}
