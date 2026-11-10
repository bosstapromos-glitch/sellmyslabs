import { listAccountDrafts } from "../../lib/account-drafts";
import { db } from "../../lib/db";
import DraftList from "./DraftList";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCustomer, customerRequests } from "../../lib/customer-account";
import { journeyTime } from "../../lib/shipping";
import SignOutAction from "../components/SignOutAction";
import RefreshRequest from "./RefreshRequest";
import styles from "./Account.module.css";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }) {
  const identity = await requireCustomer();
  const drafts = identity.emails.length
    ? await listAccountDrafts(identity, db())
    : [];
  const params = await searchParams;
  const rawPage = Number(params.page || 1);
  const page =
    Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 10000 ? rawPage : 1;
  const { requests, hasMore } = await customerRequests(identity, page);
  if (!requests.length && page > 1) redirect("/account");
  return (
    <main id="main" className={`wrap ${styles.page}`}>
      <div className={styles.heading}>
        <div>
          <h1>Your account</h1>
          <p className={styles.muted}>
            {identity.email || "Verify your email to view your requests."}
          </p>
        </div>
        <div className={styles.tools}>
          <RefreshRequest />
          <SignOutAction />
        </div>
      </div>
      <DraftList drafts={drafts} />
      {!identity.emails.length ? (
        <section className={styles.empty}>
          <h2>Verify your email first.</h2>
          <p>
            Your email must be verified before we can show requests. Sign out
            and sign in with an email verification code, or contact the shop for
            help.
          </p>
        </section>
      ) : requests.length ? (
        <>
          <h2>Submitted requests</h2>
          <ul className={styles.requests}>
            {requests.map((request) => (
              <li key={request.id}>
                <Link
                  href={`/account/${request.id}`}
                  className={styles.request}
                >
                  <div>
                    <span className={styles.reference}>
                      REQUEST {request.reference}
                    </span>
                    <h2>
                      {request.cards[0]?.name || "Your collection"}
                      {request.cards.length > 1
                        ? ` + ${request.cards.length - 1} more`
                        : ""}
                    </h2>
                    <p className={styles.muted}>
                      {request.itemCount}{" "}
                      {request.itemCount === 1 ? "item" : "items"} · Submitted{" "}
                      {journeyTime(request.createdAt)} MT
                    </p>
                  </div>
                  <div className={styles.requestStatus}>
                    <strong>{request.stage}</strong>
                    {request.offer && (
                      <span>
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(request.offer.amount)}{" "}
                        offer
                      </span>
                    )}
                    <span className="text-link">View request →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {(page > 1 || hasMore) && (
            <nav className={styles.pagination} aria-label="Request pages">
              {page > 1 && (
                <Link
                  className="plain-button"
                  href={`/account?page=${page - 1}`}
                >
                  ← Previous
                </Link>
              )}
              <span>Page {page}</span>
              {hasMore && (
                <Link
                  className="plain-button"
                  href={`/account?page=${page + 1}`}
                >
                  Next →
                </Link>
              )}
            </nav>
          )}
        </>
      ) : drafts.length ? (
        <section className={styles.empty}>
          <h2>Submitted requests</h2>
          <p>Once you send a request, you can follow its progress here.</p>
        </section>
      ) : (
        <section className={styles.empty}>
          <h2>No requests here yet.</h2>
          <p>
            Requests submitted with a verified email on this account will appear
            here. If you used another email, sign in with that address.
          </p>
          <a className="button" href="/sell">
            Request an offer
          </a>
        </section>
      )}
    </main>
  );
}
