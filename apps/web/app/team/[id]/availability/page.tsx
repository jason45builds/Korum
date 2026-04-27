"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

type AvailResponse = {
  id: string;
  user_id: string;
  response: "PENDING" | "AVAILABLE" | "UNAVAILABLE" | "MAYBE";
  note: string | null;
  responded_at: string | null;
  fullName: string;
  reliabilityScore: number;
};

type Check = {
  id: string;
  team_id: string;
  match_date: string;
  match_time: string | null;
  venue_hint: string | null;
  note: string | null;
  expires_at: string;
  locked_at: string | null;
};

const RESPONSE_CONFIG = {
  AVAILABLE:   { label: "Available ✅",    cls: "badge-success" },
  UNAVAILABLE: { label: "Not available ❌", cls: "badge-danger"  },
  MAYBE:       { label: "Maybe 🤔",         cls: "badge-warning" },
  PENDING:     { label: "No response",      cls: ""              },
};

export default function TeamAvailabilityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [checks, setChecks]       = useState<Check[]>([]);
  const [active, setActive]       = useState<Check | null>(null);
  const [responses, setResponses] = useState<AvailResponse[]>([]);
  const [loading, setLoading]     = useState(false);
  const [creating, setCreating]   = useState(false);
  const [msg, setMsg]             = useState<{ text: string; error: boolean } | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ matchDate: today, matchTime: "07:00", venueHint: "", note: "" });

  const teamId = params.id;

  const loadChecks = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/availability-check?teamId=${teamId}`, { credentials: "same-origin" });
      const data = await res.json() as { checks: Check[] };
      setChecks(data.checks ?? []);
      if (data.checks?.[0] && !active) await loadCheckDetail(data.checks[0]);
    } finally {
      setLoading(false);
    }
  };

  const loadCheckDetail = async (check: Check) => {
    setActive(check);
    const res  = await fetch(`/api/availability-check?checkId=${check.id}`, { credentials: "same-origin" });
    const data = await res.json() as { responses: AvailResponse[] };
    setResponses(data.responses ?? []);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (isAuthenticated) void loadChecks(); }, [isAuthenticated]);

  if (!authLoading && !isAuthenticated) {
    return <main><div className="page-shell"><AuthPanel title="Sign in to manage availability" /></div></main>;
  }
  if (authLoading || loading) return <main><Loader label="Loading availability…" /></main>;

  const available   = responses.filter((r) => r.response === "AVAILABLE");
  const unavailable = responses.filter((r) => r.response === "UNAVAILABLE");
  const maybe       = responses.filter((r) => r.response === "MAYBE");
  const pending     = responses.filter((r) => r.response === "PENDING");

  const handleCreate = async () => {
    setCreating(true); setMsg(null);
    try {
      const res  = await fetch("/api/availability-check", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ teamId, ...form }),
      });
      const data = await res.json() as { check?: Check; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMsg({ text: "Availability check sent to all team members!", error: false });
      // WhatsApp share
      const dateStr = new Date(form.matchDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
      const waText = `Hey team! 🏐 Are you available for our next match?\n\n📅 ${dateStr}${form.matchTime ? ` at ${form.matchTime}` : ""}${form.venueHint ? `\n📍 ${form.venueHint}` : ""}${form.note ? `\n\n“${form.note}”` : ""}\n\nPlease check the Korum app and mark your availability: https://korum.vercel.app/availability`;
      if (window.confirm("Check sent! Share on WhatsApp too?")) {
        window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, "_blank");
      }
      await loadChecks();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Failed", error: true });
    } finally { setCreating(false); }
  };

  const handleBuildSquad = () => {
    const query = new URLSearchParams({
      teamId, matchDate: active?.match_date ?? "", matchTime: active?.match_time ?? "",
      venueHint: active?.venue_hint ?? "", availableIds: available.map((r) => r.user_id).join(","),
    });
    router.push(`/create/match?${query.toString()}`);
  };

  return (
    <main>
      <div className="page-shell">
        <section className="hero-panel animate-in">
          <div className="row-between" style={{ alignItems: "flex-start" }}>
            <div>
              <p className="eyebrow">Availability</p>
              <h1 className="title-lg" style={{ marginTop: "0.3rem" }}>Who&apos;s in?</h1>
              <p className="muted" style={{ marginTop: "0.3rem", fontSize: "0.9rem" }}>
                Send a check to your team. See who&apos;s free and build the squad.
              </p>
            </div>
            <Link href={`/team/${teamId}`}>
              <Button variant="ghost" size="sm">← Team</Button>
            </Link>
          </div>
        </section>

        <div className="grid grid-2" style={{ alignItems: "start" }}>
          {/* Left: create check */}
          <div style={{ display: "grid", gap: "1rem" }}>
            <Card eyebrow="Captain" title="Send availability check">
              <div className="form-grid">
                <label className="label">
                  Match date
                  <input type="date" className="input" value={form.matchDate}
                    onChange={(e) => setForm((c) => ({ ...c, matchDate: e.target.value }))} />
                </label>
                <label className="label">
                  Preferred time
                  <input type="time" className="input" value={form.matchTime}
                    onChange={(e) => setForm((c) => ({ ...c, matchTime: e.target.value }))} />
                </label>
                <label className="label">
                  Venue <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(optional)</span>
                  <input className="input" placeholder="Nehru Stadium, Chennai" value={form.venueHint}
                    onChange={(e) => setForm((c) => ({ ...c, venueHint: e.target.value }))} />
                </label>
                <label className="label">
                  Note to team <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(optional)</span>
                  <textarea className="textarea" style={{ minHeight: "70px" }}
                    placeholder="e.g. Need 7 players, kit colour is red"
                    value={form.note} onChange={(e) => setForm((c) => ({ ...c, note: e.target.value }))} />
                </label>
                <Button onClick={() => void handleCreate()} loading={creating} block>
                  📣 Send to all team members
                </Button>
                {msg && <p className={`message-strip${msg.error ? " error" : " success"}`}>{msg.text}</p>}
              </div>
            </Card>

            {checks.length > 0 && (
              <Card eyebrow="History" title="Previous checks">
                <div className="list">
                  {checks.map((c) => (
                    <button key={c.id} onClick={() => void loadCheckDetail(c)}
                      style={{ all: "unset", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid var(--line)", cursor: "pointer", width: "100%" }}>
                      <div>
                        <strong style={{ fontSize: "0.95rem" }}>
                          {new Date(c.match_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                          {c.match_time ? ` at ${c.match_time}` : ""}
                        </strong>
                        <div className="faint" style={{ fontSize: "0.8rem" }}>{c.venue_hint ?? "Venue TBD"}</div>
                      </div>
                      <span className={`badge ${active?.id === c.id ? "badge-primary" : ""}`}>
                        {active?.id === c.id ? "Viewing" : "View"}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right: responses board */}
          {active ? (
            <div style={{ display: "grid", gap: "1rem" }}>
              <Card eyebrow="Responses" title={
                new Date(active.match_date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) +
                (active.match_time ? ` · ${active.match_time}` : "")
              }>
                <div className="grid grid-3" style={{ gap: "0.6rem" }}>
                  {[
                    { label: "Available",   count: available.length,   cls: "badge-success" },
                    { label: "Unavailable", count: unavailable.length, cls: "badge-danger"  },
                    { label: "Maybe",       count: maybe.length,       cls: "badge-warning" },
                  ].map(({ label, count }) => (
                    <div key={label} className="metric" style={{ textAlign: "center" }}>
                      <div className="eyebrow">{label}</div>
                      <strong style={{ fontSize: "1.6rem" }}>{count}</strong>
                    </div>
                  ))}
                </div>

                <div className="list">
                  {responses.map((r) => {
                    const cfg = RESPONSE_CONFIG[r.response];
                    return (
                      <div key={r.id} className="list-row">
                        <div className="row">
                          <div className="avatar" style={{ fontSize: "0.85rem" }}>
                            {r.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <strong style={{ fontSize: "0.95rem" }}>{r.fullName}</strong>
                            {r.note && (
                              <div className="faint" style={{ fontSize: "0.78rem" }}>
                                &ldquo;{r.note}&rdquo;
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                      </div>
                    );
                  })}
                </div>

                {pending.length > 0 && (
                  <p className="muted" style={{ fontSize: "0.82rem", textAlign: "center" }}>
                    {pending.length} member{pending.length > 1 ? "s" : ""} haven&apos;t responded yet
                  </p>
                )}
              </Card>

              {available.length > 0 && (
                <Card eyebrow="Next step" title={`${available.length} players available`}>
                  <p className="muted" style={{ fontSize: "0.9rem" }}>
                    Create a match with these {available.length} available players pre-selected.
                  </p>
                  <Button onClick={handleBuildSquad} block>⚽ Build Squad &amp; Create Match</Button>
                </Card>
              )}
            </div>
          ) : (
            <div className="panel" style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📋</div>
              <h3 className="title-md">No checks yet</h3>
              <p className="muted" style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
                Send your first availability check to see who&apos;s free.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
