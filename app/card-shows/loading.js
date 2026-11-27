import { Header, Footer } from "../components/Shell";
import styles from "./shows.module.css";
export default function LoadingShows() {
  return (
    <>
      <Header />
      <main id="main" className={`wrap ${styles.page}`}>
        <div className={styles.intro}>
          <h1>Card show directory</h1>
          <p role="status">Loading shows…</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
