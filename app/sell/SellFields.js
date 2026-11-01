import { useEffect, useState } from "react";
import styles from "./SellForm.module.css";

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
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return (
    <li>
      <div className={styles.photoImage}>
        {url && <img src={url} alt={`Your uploaded photo ${index + 1}`} />}
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
  return (
    <ul className={styles.photoList} aria-label="Attached photos">
      {photos.map((file, index) => (
        <Photo
          key={`${file.name}-${file.lastModified}-${index}`}
          file={file}
          index={index}
          onRemove={onRemove}
          disabled={disabled}
        />
      ))}
    </ul>
  );
}
