import { Header, Footer } from "../components/Shell";
import SellForm from "./SellForm";
export const metadata = { title: "Request an offer" };
export default function Page() {
  return (
    <>
      <Header />
      <main id="main" className="wrap form-page">
        <span className="eyebrow">YOUR COLLECTION. YOUR NEXT CHAPTER.</span>
        <h1>Let’s start with your cards.</h1>
        <p>No obligation. A real person will review your request.</p>
        <SellForm />
      </main>
      <Footer />
    </>
  );
}
