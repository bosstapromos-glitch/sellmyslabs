"use client";
import { useEffect, useRef, useState } from "react";
import { requestJSON } from "../../lib/request-json";
import { clearDraftPhotos } from "../../lib/draft-photos";
import { DRAFT_KEY, hasDraftContent } from "../../lib/draft";

const snapshot = (draft, photos) => ({
  data: { ...draft, consent: false },
  photos: photos.map(({ token, name }) => ({ token, name })),
});
export default function useAccountDraft({
  draft,
  photos,
  ready,
  done,
  paused,
  onRestore,
}) {
  const [user, setUser] = useState(null),
    [active, setActive] = useState(false),
    [loading, setLoading] = useState(true),
    [requested, setRequested] = useState(false);
  const [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState(false),
    [savedSignature, setSavedSignature] = useState("");
  const version = useRef(0),
    activeId = useRef(null),
    queue = useRef(Promise.resolve()),
    init = useRef(false),
    stopped = useRef(false);
  const restoreRef = useRef(onRestore);
  restoreRef.current = onRestore;
  const signature = JSON.stringify(snapshot(draft, photos));
  const latest = useRef({ draft, photos, signature });
  latest.current = { draft, photos, signature };
  const blocked = requested && !active;
  const hasContent = hasDraftContent(draft) || photos.length > 0;
  const dirty =
    (active || (!!user && !blocked && hasContent)) &&
    signature !== savedSignature;
  function adopt(result) {
    version.current = result.version;
    activeId.current = result.id;
    stopped.current = false;
    const loadedPhotos = result.photos.map((p) => ({ ...p, persisted: true }));
    setSavedSignature(JSON.stringify(snapshot(result.data, loadedPhotos)));
    restoreRef.current(result.data, loadedPhotos, result.expiredCount);
    setActive(true);
    setError("");
    setConflict(false);
    setRequested(false);
  }
  async function reload() {
    setLoading(true);
    try {
      const id =
        activeId.current ||
        new URLSearchParams(window.location.search).get("draft");
      adopt(
        await requestJSON(`/api/account/drafts?id=${encodeURIComponent(id)}`),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!ready || init.current) return;
    init.current = true;
    const id = new URLSearchParams(window.location.search).get("draft");
    setRequested(!!id);
    (async () => {
      try {
        const session = await requestJSON("/api/account/drafts");
        setUser({ email: session.email });
        if (id)
          adopt(
            await requestJSON(
              `/api/account/drafts?id=${encodeURIComponent(id)}`,
            ),
          );
      } catch (e) {
        if (e.status !== 401) setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready]);
  function save() {
    const captured = latest.current;
    const job = queue.current.then(async () => {
      if (stopped.current)
        throw Error("Open the latest account draft before continuing.");
      setSaving(true);
      setError("");
      try {
        const result = await requestJSON("/api/account/drafts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: captured.draft.id,
            version: version.current,
            ...snapshot(captured.draft, captured.photos),
          }),
        });
        if (!activeId.current)
          await clearDraftPhotos(result.id).catch(() => {});
        version.current = result.version;
        activeId.current = result.id;
        setActive(true);
        setSavedSignature(captured.signature);
        // The account copy is authoritative; do not leave its contact details in the guest draft.
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {}
        window.history.replaceState(null, "", `/sell?draft=${result.id}`);
        return result.version;
      } catch (e) {
        setError(e.message);
        if (e.status === 401 || e.status === 403) setUser(null);
        if (e.status === 409) {
          stopped.current = true;
          setConflict(true);
        }
        throw e;
      } finally {
        setSaving(false);
      }
    });
    queue.current = job.catch(() => {});
    return job;
  }
  useEffect(() => {
    if (
      !ready ||
      !user ||
      blocked ||
      !dirty ||
      done ||
      paused ||
      error ||
      loading ||
      conflict
    )
      return;
    const timer = setTimeout(() => {
      save().catch(() => {});
    }, 900);
    return () => clearTimeout(timer);
  }, [
    signature,
    active,
    user,
    ready,
    blocked,
    dirty,
    done,
    paused,
    error,
    loading,
    conflict,
  ]);
  async function clear() {
    if (activeId.current) {
      await queue.current;
      await requestJSON("/api/account/drafts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeId.current,
          version: version.current,
        }),
      });
    }
    activeId.current = null;
    version.current = 0;
    stopped.current = false;
    setActive(false);
    setRequested(false);
    setError("");
    setConflict(false);
    setSavedSignature("");
    window.history.replaceState(null, "", "/sell");
  }
  function finish() {
    stopped.current = true;
    setActive(false);
    activeId.current = null;
    window.history.replaceState(null, "", "/sell");
  }
  return {
    user,
    active,
    loading: ready && loading,
    blocked,
    saving,
    dirty,
    error,
    conflict,
    save,
    reload,
    clear,
    finish,
    version: () => version.current,
  };
}
