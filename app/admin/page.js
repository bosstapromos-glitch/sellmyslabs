import { Header, Footer } from "../components/Shell";
import { signedIn } from "../../lib/security";
import Workspace from "./Workspace";
export const metadata = {
  title: "Staff workspace",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Page() {
  return (
    <>
      <Header />
      <main className="wrap admin-page" id="main">
        <span className="eyebrow">SELLMYSLABS WORKSPACE</span>
        <h1>Your submission inbox.</h1>
        <Workspace authenticated={await signedIn()} />
      </main>
      <Footer />
    </>
  );
}
