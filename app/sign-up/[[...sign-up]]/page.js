import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Header, Footer } from "../../components/Shell";
import AccountAuth from "../../components/AccountAuth";
import { getIdentity, clerkConfigured } from "../../../lib/identity";
import { signedIn } from "../../../lib/security";
import { BUSINESS } from "../../../lib/site";
import styles from "../../account/Account.module.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page() {
  if (await signedIn()) redirect("/admin");
  if (await getIdentity()) redirect("/account");
  return (
    <>
      <Header context="seller" />
      <main id="main" className={styles.auth}>
        {clerkConfigured() ? (
          <Suspense fallback={<p role="status">Loading sign-up…</p>}>
            <AccountAuth signup />
          </Suspense>
        ) : (
          <div>
            <h1>Create your account</h1>
            <p>
              Account sign-up is temporarily unavailable.{" "}
              <a className="text-link" href={BUSINESS.phoneHref}>
                Contact the shop
              </a>{" "}
              for help.
            </p>
          </div>
        )}
        <p className={styles.muted}>
          An account is optional. You can still{" "}
          <a className="text-link" href="/sell">
            request an offer
          </a>{" "}
          without one.
        </p>
      </main>
      <Footer compact />
    </>
  );
}
