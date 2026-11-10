import { getIdentity } from "../../../../lib/identity";
import { db } from "../../../../lib/db";
import { sameOrigin, limited } from "../../../../lib/security";
import { createAccountDraftHandler } from "../../../../lib/account-draft-handler";
const handler = createAccountDraftHandler({
  getIdentity,
  db,
  sameOrigin,
  limited,
});
export const GET = handler;
export const PUT = handler;
export const DELETE = handler;
