"use client";
import { SignIn, SignUp } from "@clerk/nextjs";
const appearance = {
  elements: {
    rootBox: { width: "100%" },
    cardBox: { width: "100%", maxWidth: "100%", boxShadow: "none" },
    card: { boxShadow: "none", padding: 0 },
    header: { textAlign: "left", alignItems: "flex-start" },
    headerTitle: {
      fontSize: "28px",
      fontWeight: 600,
      letterSpacing: "-0.025em",
    },
    headerSubtitle: { fontSize: "16px", lineHeight: "1.6" },
    formFieldInput: { minHeight: "48px", fontSize: "16px" },
    formButtonPrimary: {
      minHeight: "48px",
      fontSize: "16px",
      boxShadow: "none",
      background: "#0071e3",
      "&::after": { boxShadow: "none" },
    },
    socialButtonsBlockButton: { minHeight: "48px", fontSize: "16px" },
    footer: { background: "transparent", backgroundImage: "none" },
  },
};
export default function AccountAuth({ signup = false }) {
  const fallback = <p role="status">Loading secure sign-in…</p>;
  return signup ? (
    <SignUp
      routing="path"
      path="/sign-up"
      signInUrl="/sign-in"
      fallbackRedirectUrl="/account"
      appearance={appearance}
      fallback={fallback}
    />
  ) : (
    <SignIn
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      fallbackRedirectUrl="/account"
      appearance={appearance}
      fallback={fallback}
    />
  );
}
