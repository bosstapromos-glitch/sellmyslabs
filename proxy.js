import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
const parties = ["https://www.sellmyslabs.net", "https://sellmyslabs.net"];
if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_")) {
  if (process.env.VERCEL_URL) parties.push(`https://${process.env.VERCEL_URL}`);
  try {
    const site = new URL(process.env.SITE_URL);
    if (["localhost", "127.0.0.1"].includes(site.hostname))
      parties.push(site.origin);
  } catch {}
}
const enabled = !!(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);
export default enabled
  ? clerkMiddleware(
      async (auth) => {
        const { userId } = await auth();
        const response = NextResponse.next();
        // Once Clerk is in use, a previous owner-only cookie must not survive sign-out
        // or switching to a customer account on the same device.
        if (userId) response.cookies.delete("sms_owner");
        return response;
      },
      { authorizedParties: parties },
    )
  : () => NextResponse.next();
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
