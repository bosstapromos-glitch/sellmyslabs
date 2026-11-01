import { Header, Footer } from "../components/Shell";
import { signedIn } from "../../lib/security";
import Workspace from "./Workspace";
import { getIdentity } from "../../lib/identity";
import { redirect } from "next/navigation";
export const metadata = {
  title: "Your portal",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Page() {
  const identity = await getIdentity();
  if (identity && !identity.isOwner) redirect("/account");
  const authenticated = await signedIn();
  return (
    <>
      <Header context="owner" />
      <main className="wrap admin-page" id="main">
        <span className="eyebrow">SELLMYSLABS</span>
        <h1>{authenticated ? "Submission inbox" : "Sign in"}</h1>
        <Workspace authenticated={authenticated} />
      </main>
      <Footer compact />
    </>
  );
}
