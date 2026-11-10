import ResumeDraft from "../components/ResumeDraft";
import Link from "next/link";
import { journeyTime } from "../../lib/shipping";
import styles from "./Account.module.css";
export default function DraftList({ drafts }) {
  return (
    <>
      {!!drafts.length && (
        <>
          <ResumeDraft draft={drafts[0]} />
          {drafts.length > 1 && (
            <section aria-labelledby="drafts-heading">
              <h2 id="drafts-heading">Other saved drafts</h2>
              <ul className={styles.requests}>
                {drafts.slice(1).map((draft) => (
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
      )}
    </>
  );
}
