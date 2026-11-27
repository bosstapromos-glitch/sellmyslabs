import { ClerkProvider } from "@clerk/nextjs";

// Clerk's browser script keeps a signed-in session fresh, so it must load on
// every screen that signs in, signs out or saves to an account. Public pages
// leave it out. Wrap a route's layout in this; do not add it to the root layout.
export default function AuthProvider({ children }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return children;
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/account"
      signUpFallbackRedirectUrl="/account"
      localization={{
        signIn: {
          emailCode: {
            subtitle: "Use the code from your email to sign in.",
          },
          password: { subtitle: "Continue to your SellMySlabs account." },
          start: {
            title: "Sign in",
            titleCombined: "Sign in",
            subtitle: "See your requests, offers and purchase progress.",
            subtitleCombined:
              "See your requests, offers and purchase progress.",
          },
        },
        signUp: {
          emailCode: { subtitle: "Enter the code to verify your email." },
          start: {
            title: "Create your account",
            titleCombined: "Create your account",
            subtitle:
              "Use the email on your request to see your items, offers and progress.",
            subtitleCombined:
              "Use the email on your request to see your items, offers and progress.",
          },
        },
      }}
      appearance={{
        variables: {
          colorPrimary: "#0071e3",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
          borderRadius: "12px",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
