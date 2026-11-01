import styles from "./Account.module.css";
export default function Loading() {
  return (
    <main id="main" className={`wrap ${styles.page}`}>
      <h1>Your requests</h1>
      <p role="status">Loading your requests…</p>
    </main>
  );
}
