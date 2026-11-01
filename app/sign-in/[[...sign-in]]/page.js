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
  title: "Sign in",
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
          <Suspense fallback={<p role="status">Loading sign-in…</p>}>
            <AccountAuth />
          </Suspense>
        ) : (
          <div>
            <h1>Sign in</h1>
            <p>
              Account sign-in is temporarily unavailable.{" "}
              <a className="text-link" href={BUSINESS.phoneHref}>
                Contact the shop
              </a>{" "}
              for help.
            </p>
          </div>
        )}
      </main>
      <Footer compact />
    </>
  );
}
