"use client";
import styles from "./PhotoPager.module.css";
export const PHOTO_PAGE_SIZE = 12;
export default function PhotoPager({ page, total, onChange }) {
  if (total <= PHOTO_PAGE_SIZE) return null;
  const last = Math.ceil(total / PHOTO_PAGE_SIZE) - 1;
  return (
    <nav className={styles.pager} aria-label="Photo pages">
      <button
        type="button"
        className="plain-button"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        Previous photos
      </button>
      <span role="status">
        {page * PHOTO_PAGE_SIZE + 1}–
        {Math.min(total, (page + 1) * PHOTO_PAGE_SIZE)} of {total}
      </span>
      <button
        type="button"
        className="plain-button"
        disabled={page >= last}
        onClick={() => onChange(page + 1)}
      >
        Next photos
      </button>
    </nav>
  );
}
