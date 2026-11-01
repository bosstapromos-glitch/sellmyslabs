import "server-only";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getIdentity } from "./identity";
import { purchasePath } from "./purchase-token";
import {
  CLAIM_CUSTOMER_REQUESTS_SQL,
  CUSTOMER_REQUESTS_SQL,
  CUSTOMER_REQUEST_SQL,
  customerRequest,
  validRequestId,
} from "./customer-records";
export async function requireCustomer(returnPath = "/account") {
  const identity = await getIdentity();
  if (!identity)
    redirect(`/sign-in?redirect_url=${encodeURIComponent(returnPath)}`);
  if (identity.isOwner) redirect("/admin");
  return identity;
}
export async function claimRequests(identity) {
  if (!identity.emails.length || identity.isOwner) return;
  await db().query(CLAIM_CUSTOMER_REQUESTS_SQL, [identity.id, identity.emails]);
}
function present(row) {
  const request = customerRequest(row);
  if (request?.offer?.hasAgreement)
    request.offer.url = purchasePath(request.offer.id);
  return request;
}
export async function customerRequests(identity, page) {
  if (!identity.emails.length || identity.isOwner)
    return { requests: [], hasMore: false };
  await claimRequests(identity);
  const rows = await db().query(CUSTOMER_REQUESTS_SQL, [
    identity.id,
    (page - 1) * 20,
  ]);
  return {
    requests: rows.slice(0, 20).map(present),
    hasMore: rows.length > 20,
  };
}
export async function customerRequestById(identity, id) {
  if (!identity.emails.length || identity.isOwner || !validRequestId(id))
    return null;
  await claimRequests(identity);
  const [row] = await db().query(CUSTOMER_REQUEST_SQL, [identity.id, id]);
  return present(row);
}
