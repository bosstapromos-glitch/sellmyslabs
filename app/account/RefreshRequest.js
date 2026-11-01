"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
export default function RefreshRequest() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="plain-button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Refreshing…" : "Refresh"}
    </button>
  );
}
