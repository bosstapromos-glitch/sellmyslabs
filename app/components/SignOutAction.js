"use client";
import { useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { requestJSON } from "../../lib/request-json";
function Action({
  signOut,
  disabled,
  before,
  onWorking,
  onSessionCleared,
  onError,
  redirectUrl = "/admin",
  className = "plain-button",
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function leave() {
    if (busy || disabled || (before && !before())) return;
    setBusy(true);
    onWorking?.(true);
    setError("");
    try {
      await requestJSON("/api/auth/logout", { method: "POST" });
      onSessionCleared?.();
      if (signOut) await signOut({ redirectUrl });
      else location.assign(redirectUrl);
    } catch (failure) {
      if (onError) onError(failure);
      else setError("Could not finish signing out. Please try again.");
      setBusy(false);
      onWorking?.(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled || busy}
        onClick={leave}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
function ClerkAction(props) {
  const { signOut } = useClerk();
  const { isLoaded, isSignedIn } = useUser();
  return (
    <Action
      {...props}
      signOut={isSignedIn ? signOut : undefined}
      redirectUrl="/sign-in"
      disabled={props.disabled || !isLoaded}
    />
  );
}
export default function SignOutAction(props) {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
    <ClerkAction {...props} />
  ) : (
    <Action {...props} />
  );
}
