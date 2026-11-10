import { journeyTime } from "../../lib/shipping";
import styles from "./ResumeDraft.module.css";

export default function ResumeDraft({ draft, otherCount = 0 }) {
  return (
    <section className={styles.resume} aria-labelledby="resume-draft-heading">
      <div>
        <h2 id="resume-draft-heading">Pick up where you left off.</h2>
        <h3>{draft.title}</h3>
        <p>
          {draft.photoCount} photo{draft.photoCount === 1 ? "" : "s"} ·{" "}
          <time dateTime={draft.updatedAt} className={styles.savedAt}>
            Saved {journeyTime(draft.updatedAt)} MT
          </time>
        </p>
        <p>Your saved details and available photos are ready to continue.</p>
      </div>
      <div className={styles.actions}>
        <a className="button" href={`/sell?draft=${draft.id}`}>
          Continue draft
        </a>
        {otherCount > 0 && (
          <a className="text-link" href="/account/drafts">
            View all {otherCount + 1} drafts
          </a>
        )}
      </div>
    </section>
  );
}
