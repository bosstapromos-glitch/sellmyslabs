import Link from "next/link";
import { journeyTime } from "../../lib/shipping";
import styles from "./Account.module.css";
export default function DraftList({ drafts }) {
  return (
    <>
      {!!drafts.length && (
        <section aria-labelledby="drafts-heading">
          <h2 id="drafts-heading">Drafts</h2>
          <p className={styles.muted}>
            Not submitted yet. Continue where you left off.
          </p>
          <ul className={styles.requests}>
            {drafts.map((draft) => (
              <li key={draft.id}>
                <Link
                  href={`/sell?draft=${draft.id}`}
                  className={styles.request}
                >
                  <div>
                    <h3>{draft.title}</h3>
                    <p className={styles.muted}>
                      {draft.photoCount} photo
                      {draft.photoCount === 1 ? "" : "s"} · Saved{" "}
                      {journeyTime(draft.updatedAt)} MT
                    </p>
                  </div>
                  <span className="text-link">Continue draft →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
