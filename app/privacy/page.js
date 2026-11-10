import { Header, Footer } from "../components/Shell";
import { BUSINESS } from "../../lib/site";
export const metadata = {
  title: "Privacy Notice",
  description:
    "How SellMySlabs handles your contact details, card photos, asking prices and submissions. Learn about your privacy choices and how to contact our shop.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Notice | SellMySlabs",
    description:
      "How SellMySlabs handles your contact details, card photos, asking prices and submissions. Learn about your privacy choices and how to contact our shop.",
    url: "/privacy",
    type: "website",
    siteName: "SellMySlabs",
    images: [
      {
        url: "/opengraph-image?v=2",
        width: 1200,
        height: 630,
        alt: "SellMySlabs — Graded cards, raw cards and sealed products",
      },
    ],
  },
};
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
          We collect the name, email, optional phone number, card and product
          details, asking prices, your choice of direct sale or consignment,
          notes and photos you submit. The website also uses limited request
          information to protect forms against abuse. If you accept an offer
          online, we also retain the listed items, price, exact purchase terms,
          the name you enter and the time of acceptance. If you share tracking,
          we retain the carrier, tracking number and purchase progress confirmed
          by you and the shop.
        </p>
        <p>
          Photos upload privately as you add them to the form, before you send
          your request. Uploads not included in a submitted request are
          scheduled for deletion after 31 days. Removing a photo or clearing a
          draft excludes it from your request.
        </p>
        <h2>How we use it</h2>
        <p>
          We use your information to evaluate your items, contact you about your
          request, and manage a potential purchase or consignment. For
          consignment, we confirm listing arrangements before sharing item
          descriptions and photos with prospective buyers in-store or on eBay.
          Sending a request is not a subscription to marketing messages.
        </p>
        <h2>Where it goes</h2>
        <p>
          Submissions are stored in a private workspace for the shop. Our
          hosting, database, file storage and email providers process
          information needed to operate this service. Submitted photos are
          accessed through the signed-in workspace, not a public gallery. Offer
          emails may include a price explanation and reference images selected
          by the shop. Private offer links let anyone holding the link view that
          specific offer and, while it is available, accept it. Keep your link
          private. Accepted purchase records are emailed to the seller and the
          shop. Optional customer accounts use Clerk for sign-in and email
          verification. Requests with a matching verified email can be linked to
          your account; after that, they remain linked to your account ID. You
          can view those requests and their photos after signing in. Shop-only
          notes and private valuation tools are not shared with customer
          accounts.
        </p>
        <h2>Drafts saved to your account</h2>
        <p>
          When you’re signed in, your draft details and photo references save
          automatically and privately to your account as you fill out the form.
          A draft started in this browser before sign-in is saved to your
          account when you return to the form after signing in. Sign in to the
          same account on another device to continue. Drafts remain available
          for 30 days after their last save; photos expire 30 days after upload.
          Expired drafts are scheduled for deletion after 31 days. Clearing an
          account draft removes it from your account; uploaded photos follow the
          deletion schedule above.
        </p>
        <h2>Information on your device</h2>
        <p>
          When you’re not signed in, the request form saves a draft in this
          browser so you can continue later. Small photo previews and private
          upload references are saved on this device so uploaded photos can be
          restored for up to 30 days in the same browser. A browser-only draft
          will not follow you to another device. Use “Clear draft” to remove the
          saved details and photo previews, particularly on a shared device.
          Sign-in uses a secure session cookie.
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
          <a className="text-link" href={BUSINESS.phoneHref}>
            {BUSINESS.phone}
          </a>
          <br />
          {BUSINESS.address}
        </p>
      </main>
      <Footer />
    </>
  );
}
