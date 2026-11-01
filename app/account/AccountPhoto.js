"use client";
import { useState } from "react";
import styles from "./Account.module.css";
export default function AccountPhoto({ id, index }) {
  const [failed, setFailed] = useState(false);
  const src = `/api/account/photo?id=${encodeURIComponent(id)}&index=${index}`;
  return (
    <figure className={styles.photo}>
      {failed ? (
        <div className={styles.photoError}>
          <p>This photo couldn’t load.</p>
          <button
            type="button"
            className="plain-button"
            onClick={() => setFailed(false)}
          >
            Try again
          </button>
        </div>
      ) : (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open submitted photo ${index + 1}`}
        >
          <img
            src={src}
            alt={`Your submitted photo ${index + 1}`}
            width="400"
            height="300"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        </a>
      )}
      <figcaption>Photo {index + 1}</figcaption>
    </figure>
  );
}
