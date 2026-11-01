"use client";
import { useEffect, useRef } from "react";

export default function useUnsavedChanges(unsaved) {
  const unloadWarning = useRef(null);
  function allowUnload() {
    if (unloadWarning.current)
      window.removeEventListener("beforeunload", unloadWarning.current);
  }
  useEffect(() => {
    if (!unsaved) return;
    const beforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    unloadWarning.current = beforeUnload;
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [unsaved]);
  return {
    confirmLeave: () =>
      !unsaved ||
      window.confirm(
        "Leave without saving? Your changes to this request will be lost.",
      ),
    allowUnload,
  };
}
