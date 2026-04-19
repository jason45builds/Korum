"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

type PendingItem = {
  id: string;
  check_id: string;
  response: string;
  availability_checks: {
    id: string;
    team_id: string;
    match_date: string;
    match_time: string | null;
    venue_hint: string | null;
    note: string | null;
    expires_at: string;
  };
};

const RESP_OPTS = [
  { value: "AVAILABLE",   label: "I'm in ✅",    bg: "var(--success)",       color: "#fff" },
  { value: "MAYBE",       label: "Maybe 🤔",      bg: "var(--warning)",       color: "#fff" },
  { value: "UNAVAILABLE", label: "Can't make it ❌", bg: "var(--danger)",    color: "#fff" },
] as const;

export default function PlayerAvailabilityPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [pending, setPending]     = useState<PendingItem[]>([]);
  const [loading, setLoading]     = useState(false);
  const [responding, setResponding] = useState<string | null>(null);
  const [notes, setNotes]         = useState<Record<string, string>>({});
  const [done, setDone]           = useState<Set<string>>(new Set());

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated]);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/availability-check", { credentials: "same-origin" });
      const data = await res.json() as { pending: PendingItem[] };
      setPending(data.pending ?? []);
    } finally {
      setLoading(false);
    }
  };

  const respond = async (checkId: string, response: string) => {
    setResponding(checkId + response);
    try {
      await fetch("/api/availability-check", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ checkId, response, note: notes[checkId] || null }),
      });
      setDone((d) => new Set([...d, checkId]));
    } catch {
      // ignore
    } finally {
      setResponding(null);
    }
  };

  if (!authLoading && !isAuthenticated) {
    return <main><div className="page-shell"><AuthPanel title="Sign in to manage your availability" /></div></main>;
  }
  if (authLoading || loading) return <main><Loader label="Loading your availability requests…" /></main>;

  const unanswered = pending.filter((p) => !done.has(p.availability_checks.id));
  const answered   = pending.filter((p) =>  done.has(p.availability_checks.id));

  return (
    <main>
      <div className="page-shell">
        <section className="hero-panel animate-in">
          <p className="eyebrow">My Availability</p>
          <h1 className="title-lg" style={{ marginTop: "0.3rem" }}>Are you free?</h1>
          <p className="muted" style={{ marginTop: "0.3rem", fontSize: "0.9rem" }}>
            Your captains are waiting to know if you're available. Tap once to respond.
          </p>
        </section>

        {unanswered.length === 0 && answered.length === 0 && (
          <div className="panel" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🎉</div>
            <h3 className="title-md">All caught up!</h3>
            <p className="muted" style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
              No pending availability requests from your captains.
            </p>
          </div>
        )}

        {unanswered.length > 0 && (
          <section style={{ display: "grid", gap: "0.75rem" }}>
            <p className="eyebrow">{unanswered.length} pending</p>
            {unanswered.map((item) => {
              const chk = item.availability_checks;
              const isExpired = new Date(chk.expires_at) < new Date();
              return (
                <div key={item.id} className="panel animate-in" style={{ display: "grid", gap: "1rem" }}>
                  {/* Match info */}
                  <div>
                    <div className="row-between">
                      <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>
                        {new Date(chk.match_date).toLocaleDateString("en-IN", {
                          weekday: "long", day: "numeric", month: "long",
                        })}
                        {chk.match_time ? ` · ${chk.match_time}` : ""}
                      </strong>
                      {isExpired && <span className="badge badge-danger">Expired</span>}
                    </div>
                    {chk.venue_hint && (
                      <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                        📍 {chk.venue_hint}
                      </p>
                    )}
                    {chk.note && (
                      <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem", fontStyle: "italic" }}>
                        "{chk.note}"
                      </p>
                    )}
                  </div>

                  {/* Optional note */}
                  <input
                    className="input"
                    placeholder="Add a note (optional)"
                    value={notes[chk.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [chk.id]: e.target.value }))}
                    style={{ fontSize: "0.88rem" }}
                  />

                  {/* Response buttons */}
                  <div className="grid grid-3" style={{ gap: "0.5rem" }}>
                    {RESP_OPTS.map((opt) => (
                      <button
                        key={opt.value}
                        disabled={!!responding || isExpired}
                        onClick={() => void respond(chk.id, opt.value)}
                        style={{
                          padding: "0.75rem 0.5rem",
                          border: "none",
                          borderRadius: "var(--radius-sm)",
                          background: responding === chk.id + opt.value ? opt.bg : "var(--surface-muted)",
                          color: responding === chk.id + opt.value ? opt.color : "var(--text)",
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: "0.82rem",
                          cursor: isExpired ? "not-allowed" : "pointer",
                          opacity: isExpired ? 0.5 : 1,
                          transition: "all 150ms ease",
                          textAlign: "center",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = opt.bg; (e.currentTarget as HTMLButtonElement).style.color = opt.color; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-muted)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"; }}
                      >
                        {responding === chk.id + opt.value ? "Saving…" : opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {answered.length > 0 && (
          <section style={{ display: "grid", gap: "0.75rem" }}>
            <p className="eyebrow">Responded</p>
            {answered.map((item) => {
              const chk = item.availability_checks;
              return (
                <div key={item.id} className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                  <div>
                    <strong style={{ fontSize: "0.95rem" }}>
                      {new Date(chk.match_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                    </strong>
                    {chk.venue_hint && <div className="faint" style={{ fontSize: "0.8rem" }}>{chk.venue_hint}</div>}
                  </div>
                  <span className="badge badge-success">Responded ✓</span>
                </div>
              );
            })}
          </section>
        )}

        <div style={{ textAlign: "center", paddingTop: "0.5rem" }}>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">← Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
