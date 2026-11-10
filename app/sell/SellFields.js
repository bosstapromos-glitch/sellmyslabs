import { useEffect, useState } from "react";
import styles from "./SellForm.module.css";
import PhotoPager, { PHOTO_PAGE_SIZE } from "../components/PhotoPager";
import { photoPreview } from "../../lib/prepare-photo";

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

function Photo({ file, index, onRemove, disabled }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (file.previewUrl) {
      setUrl(file.previewUrl);
      return;
    }
    const next = URL.createObjectURL(file.preview || photoPreview(file));
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
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
        <span>Photo {index + 1}</span>
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
