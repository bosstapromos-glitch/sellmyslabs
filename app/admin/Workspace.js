"use client";
import { useState, useEffect, useCallback } from "react";
import { STATUSES } from "../../lib/validation";
export default function Workspace({ authenticated }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [offer, setOffer] = useState("");
  const [saved, setSaved] = useState(false);
  const refresh = useCallback(async () => {
    const r = await fetch("/api/admin/submissions");
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setList(d.submissions);
  }, []);
  async function open(id) {
    setError("");
    setSaved(false);
    setSelected(null);
    try {
      const r = await fetch(`/api/admin/submissions?id=${id}`);
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setSelected(d.submission);
      setStatus(d.submission.status);
      setNotes(d.submission.internal_notes);
      setOffer(d.submission.offer ?? "");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (authenticated) {
      refresh().catch((e) => setError(e.message));
      const id = new URLSearchParams(location.search).get("id");
      if (id) open(id);
    } else if (new URLSearchParams(location.search).has("error"))
      setError(
        "That sign-in link has expired or was already used. Request a new one.",
      );
  }, [authenticated, refresh]);
  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const r = await fetch("/api/admin/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          status,
          notes,
          offer: String(offer),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setSaved(true);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!authenticated)
    return (
      <div style={{ maxWidth: 500 }}>
        <p>
          Sign in with your owner email. We’ll send you a secure, single-use
          link.
        </p>
        {sent ? (
          <div className="success" role="status">
            If this address has workspace access, a sign-in link is on its way.
            Check your inbox and spam folder.
          </div>
        ) : (
          <form onSubmit={login} className="panel">
            <label className="field">
              Owner email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button
              style={{ marginTop: 20 }}
              className="button"
              disabled={busy}
            >
              {busy ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  const filtered = list.filter((s) =>
    `${s.seller_name} ${s.id} ${s.status}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  return (
    <>
      <div className="admin-toolbar">
        <label>
          <span className="sr-only">Search requests</span>
          <input
            placeholder="Search by name, reference or status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
        <div>
          <button
            className="plain-button"
            onClick={() => refresh().catch((e) => setError(e.message))}
          >
            Refresh inbox
          </button>
          <button
            className="button quiet small"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              location.assign("/admin");
            }}
          >
            Sign out
          </button>
        </div>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div className="admin-grid">
        <aside aria-label="Submissions">
          <p className="hint">{filtered.length} requests · newest first</p>
          {filtered.map((s) => (
            <button
              key={s.id}
              className={`inbox-item ${selected?.id === s.id ? "active" : ""}`}
              onClick={() => open(s.id)}
            >
              <strong>{s.seller_name}</strong>
              <small>
                {new Date(s.created_at).toLocaleDateString()} · {s.card_count}{" "}
                card entries
              </small>
              <span className="badge">{s.status}</span>
              {!s.notified_at && <small>Notification pending</small>}
            </button>
          ))}
          {!filtered.length && (
            <div className="panel">
              <p>No requests to show yet.</p>
            </div>
          )}
        </aside>
        <section aria-label="Request details">
          {!selected ? (
            <div className="panel">
              <h2>Everything in one place.</h2>
              <p>
                Select a request to review its cards, photos and contact
                details.
              </p>
            </div>
          ) : (
            <>
              <div className="panel">
                <span className="eyebrow">
                  REQUEST {selected.id.slice(0, 8).toUpperCase()}
                </span>
                <h2>{selected.seller_name}</h2>
                <p>
                  <a className="text-link" href={`mailto:${selected.email}`}>
                    {selected.email}
                  </a>
                  {selected.phone && (
                    <>
                      <br />
                      <a href={`tel:${selected.phone}`}>{selected.phone}</a>
                    </>
                  )}
                </p>
                <p className="hint">
                  Received {new Date(selected.created_at).toLocaleString()}
                </p>
                {selected.seller_notes && (
                  <p style={{ whiteSpace: "pre-wrap" }}>
                    {selected.seller_notes}
                  </p>
                )}
              </div>
              <div className="panel">
                <h2>Cards to review</h2>
                {selected.cards.map((c, i) => (
                  <div className="review-row" key={i}>
                    <div>
                      <strong>{c.name}</strong>
                      <br />
                      <span>
                        {c.category} · {c.grader} {c.grade} · Qty {c.quantity}
                        {c.cert && ` · Cert ${c.cert}`}
                      </span>
                    </div>
                    <span>
                      {c.asking ? `$${c.asking} each` : "Open to an offer"}
                    </span>
                  </div>
                ))}
                <div className="photo-grid" style={{ marginTop: 22 }}>
                  {selected.photos.map((p) => (
                    <a
                      key={p.index}
                      href={`/api/admin/photo?id=${selected.id}&index=${p.index}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={`/api/admin/photo?id=${selected.id}&index=${p.index}`}
                        alt={`Seller photo ${p.index + 1}`}
                      />
                    </a>
                  ))}
                </div>
              </div>
              <form className="panel" onSubmit={save}>
                <h2>Manage this request</h2>
                <div className="field-grid">
                  <label className="field">
                    Status
                    <select
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value);
                        setSaved(false);
                      }}
                    >
                      {STATUSES.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Total offer (USD)
                    <input
                      inputMode="decimal"
                      value={offer}
                      maxLength={20}
                      onChange={(e) => {
                        setOffer(e.target.value);
                        setSaved(false);
                      }}
                      placeholder="Optional"
                    />
                  </label>
                  <label className="field full">
                    Private notes
                    <textarea
                      maxLength={10000}
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value);
                        setSaved(false);
                      }}
                    />
                  </label>
                </div>
                <p className="hint">
                  Notes, offers and status changes stay in your workspace.
                  Contact the seller separately to confirm an offer or shipping
                  details.
                </p>
                <button className="button" disabled={busy}>
                  {busy ? "Saving…" : "Save changes"}
                </button>
                {saved && (
                  <p className="success" role="status">
                    Changes saved.
                  </p>
                )}
              </form>
            </>
          )}
        </section>
      </div>
    </>
  );
}
