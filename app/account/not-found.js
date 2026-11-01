import styles from "./Account.module.css";
export default function NotFound() {
  return (
    <main id="main" className={`wrap ${styles.page}`}>
      <h1>This request isn’t available.</h1>
      <p>You can view requests linked to your account.</p>
      <a className="button" href="/account">
        Back to your requests
      </a>
    </main>
  );
}
