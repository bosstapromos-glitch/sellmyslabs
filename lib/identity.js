import "server-only";
import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { verifiedIdentity } from "./account-identity";
export function clerkConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY
  );
}
export const getIdentity = cache(async () => {
  if (!clerkConfigured()) return null;
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  if (!user || user.id !== userId)
    throw new Error("Could not verify this account.");
  return verifiedIdentity(user, process.env.OWNER_EMAIL);
});
