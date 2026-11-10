import { redirect } from "next/navigation";
import { getIdentity } from "../../../lib/identity";
import { db } from "../../../lib/db";
import { listAccountDrafts } from "../../../lib/account-drafts";
import DraftList from "../DraftList";
import styles from "../Account.module.css";
export const dynamic = "force-dynamic";
export default async function Page() {
  const identity = await getIdentity();
  if (!identity?.emails?.length)
    redirect("/sign-in?redirect_url=%2Faccount%2Fdrafts");
  const drafts = await listAccountDrafts(identity, db());
  return (
    <main id="main" className={`wrap ${styles.page}`}>
      <h1>Your saved drafts</h1>
      <p className={styles.muted}>{identity.email}</p>
      <DraftList drafts={drafts} />
      {!drafts.length && (
        <section className={styles.empty}>
          <h2>No saved drafts.</h2>
          <p>Save a request to your account to continue on another device.</p>
        </section>
      )}
      <a className="button" href="/sell">
        Start a request
      </a>{" "}
      <a className="plain-button" href="/account">
        Back to your account
      </a>
    </main>
  );
}
