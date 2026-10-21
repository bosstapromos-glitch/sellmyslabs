import { Header, Footer } from "../components/Shell";
import { BUSINESS } from "../../lib/site";
export const metadata = { title: "Privacy notice" };
export default function Page() {
  return (
    <>
      <Header />
      <main id="main" className="wrap prose">
        <span className="eyebrow">YOUR INFORMATION</span>
        <h1>Privacy, in plain language.</h1>
        <p>
          SellMySlabs is operated by {BUSINESS.name}. This notice explains how
          this website handles information you provide when requesting an offer.
        </p>
        <h2>What we collect</h2>
        <p>
          We collect the name, email, optional phone number, card details, notes
          and photos you submit. The website also uses limited request
          information to protect forms against abuse.
        </p>
        <h2>How we use it</h2>
        <p>
          We use your information to evaluate your cards, contact you about your
          request, and manage a potential purchase. Sending a request is not a
          subscription to marketing messages.
        </p>
        <h2>Where it goes</h2>
        <p>
          Submissions are stored in a private workspace for the shop. Our
          hosting, database, file storage and email providers process
          information needed to operate this service. Photos are accessed
          through the signed-in workspace, not a public gallery.
        </p>
        <h2>Information on your device</h2>
        <p>
          The request form saves a draft in this browser so you can continue
          later. Photos are not saved in that draft. Use “Clear draft” to remove
          it, particularly on a shared device. Staff sign-in uses a secure
          session cookie.
        </p>
        <h2>Your choices</h2>
        <p>
          You can request access, a correction, or deletion of your submission
          by contacting us. We may need to retain records connected to completed
          transactions or legal obligations. Please do not include payment card
          details, identity documents or other sensitive information in your
          request.
        </p>
        <h2>Contact us</h2>
        <p>
          <a className="text-link" href={`mailto:${BUSINESS.email}`}>
            {BUSINESS.email}
          </a>
          <br />
          {BUSINESS.phone}
          <br />
          {BUSINESS.address}
        </p>
      </main>
      <Footer />
    </>
  );
}
