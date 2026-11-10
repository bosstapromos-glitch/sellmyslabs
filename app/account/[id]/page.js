import { saleMethodLabel } from "../../../lib/sale-method";
import { CONSIGNMENT_PAYMENT } from "../../../lib/consignment";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  requireCustomer,
  customerRequestById,
} from "../../../lib/customer-account";
import { journeyTime } from "../../../lib/shipping";
import { BUSINESS } from "../../../lib/site";
import ShippingPanel from "../../offer/[token]/ShippingPanel";
import RefreshRequest from "../RefreshRequest";
import AccountPhotos from "../AccountPhotos";
import styles from "../Account.module.css";
export const dynamic = "force-dynamic";
const money = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
export default async function Page({ params }) {
  const { id } = await params;
  const identity = await requireCustomer(`/account/${encodeURIComponent(id)}`);
  if (!identity.emails.length) notFound();
  const request = await customerRequestById(identity, id);
  if (!request) notFound();
  return (
    <main id="main" className={`wrap ${styles.page}`}>
      <Link className="plain-button" href="/account">
        ← Your requests
      </Link>
      <div className={styles.heading}>
        <div>
          <span className={styles.reference}>
            {saleMethodLabel(request.saleMethod)} · {request.reference}
          </span>
          <h1>{request.stage}</h1>
          <p className={styles.muted}>
            Submitted {journeyTime(request.createdAt)} MT
          </p>
        </div>
        <RefreshRequest />
      </div>
      {request.offer ? (
        <section className={styles.offer} aria-label="Your offer">
          <div>
            <h2>{request.offer.acceptedAt ? "Agreed price" : "Our offer"}</h2>
            <strong className={styles.amount}>
              {money(request.offer.amount)}
            </strong>
            <p className={styles.muted}>Total for the listed collection</p>
          </div>
          <div>
            {request.offer.url ? (
              <a className="button" href={`${request.offer.url}?from=account`}>
                {request.offer.acceptedAt
                  ? "View accepted offer"
                  : request.closed
                    ? "View offer"
                    : "Review offer"}
              </a>
            ) : (
              <p>
                This earlier offer is in your email.{" "}
                <a className="text-link" href={BUSINESS.phoneHref}>
                  Contact the shop
                </a>{" "}
                for an updated acceptance link.
              </p>
            )}
          </div>
        </section>
      ) : (
        <p className={styles.notice}>
          {request.closed
            ? "This request is closed. Contact the shop if you need help."
            : request.stage === "Paid"
              ? "The shop has marked this request Paid."
              : request.saleMethod === "consignment"
                ? {
                    "Payment sent":
                      "We’ve marked your payout as sent. Transfer processing times depend on the payment method.",
                    "Sold · awaiting payout":
                      "Your items are marked sold. We’ll initiate your payout when the buyer’s payment is received.",
                    "Listed for sale":
                      "Your items are listed for sale. We’ll send buyer offers for your approval by email.",
                    "Consignment confirmed":
                      "Your consignment arrangements are confirmed. Follow the delivery instructions agreed with the shop.",
                    "Awaiting items":
                      "We’re waiting for your items. Follow the delivery instructions agreed with the shop.",
                  }[request.stage] ||
                  "Your consignment request is saved. We’ll confirm arrangements and send buyer offers for your approval by email."
                : "Your request is saved. We’ll email you when your offer is ready."}
        </p>
      )}
      {request.offer?.acceptedAt && request.offer.url && (
        <ShippingPanel token={request.offer.url.slice("/offer/".length)} />
      )}
      {request.saleMethod === "consignment" && (
        <section className={styles.notice}>
          <p>
            Your asking prices are sale-price targets before fees and our share.
            We’ll aim for your targets and ask for approval before accepting
            buyer offers.
          </p>
          <p>{CONSIGNMENT_PAYMENT}</p>
          <a className="text-link" href="/consignment">
            View payout rates and fees
          </a>
        </section>
      )}
      <section className={styles.section} aria-labelledby="your-items">
        <h2 id="your-items">Your items</h2>
        <ul className={styles.items}>
          {request.cards.map((item, index) => (
            <li key={index}>
              <h3>{item.name}</h3>
              <p>
                {item.itemType} · {item.category}
                {item.itemType === "Graded card"
                  ? ` · ${item.grader} ${item.grade}`
                  : ""}{" "}
                · Qty {item.quantity}
              </p>
              {item.cert && <p>Certification: {item.cert}</p>}
              {item.condition && <p>Condition: {item.condition}</p>}
              {item.asking && (
                <p>Asking price: {money(Number(item.asking))} each</p>
              )}
            </li>
          ))}
        </ul>
        {request.askingTotal && (
          <p>
            Your total asking price:{" "}
            <strong>{money(request.askingTotal)}</strong>
          </p>
        )}
      </section>
      {request.photoCount > 0 && (
        <section className={styles.section} aria-labelledby="your-photos">
          <h2 id="your-photos">Your photos</h2>
          <AccountPhotos id={id} count={request.photoCount} />
        </section>
      )}
      {request.notes && (
        <section className={styles.section}>
          <h2>Your note</h2>
          <p className={styles.note}>{request.notes}</p>
        </section>
      )}
      <p className={styles.muted}>
        Need help with this request?{" "}
        <a className="text-link" href={BUSINESS.phoneHref}>
          Call {BUSINESS.phone}
        </a>
        .
      </p>
    </main>
  );
}
