"use client";
import styles from "./Account.module.css";
export default function Error({ reset }) {
  return (
    <main id="main" className={`wrap ${styles.page}`}>
      <h1>We couldn’t load your requests.</h1>
      <p role="alert">Your saved requests haven’t changed. Please try again.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
