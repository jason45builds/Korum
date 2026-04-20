"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { createMatch } from "@/services/api/match";
import { createTeam, getMyTeams } from "@/services/api/team";
import { SPORT_OPTIONS } from "@/lib/constants";
import type { TeamDetails } from "@korum/types/team";

const toLDT = (d: Date) => d.toISOString().slice(0, 16);

function CreateMatchInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const prefillDate   = searchParams.get("matchDate") ?? "";
  const prefillTime   = searchParams.get("matchTime") ?? "";
  const prefillVenue  = searchParams.get("venueHint") ?? "";
  const prefillTeamId = searchParams.get("teamId") ?? "";

  const defaultStart  = prefillDate && prefillTime
    ? new Date(`${prefillDate}T${prefillTime}`).toISOString().slice(0, 16)
    : toLDT(new Date(Date.now() + 48 * 60 * 60 * 1000));

  const [teams, setTeams]     = useState<TeamDetails[]>([]);
  const [submitting, setSub]  = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [msg, setMsg]         = useState<string | null>(null);
  const [form, setForm]       = useState({
    teamId: prefillTeamId, title: "", sport: "Football",
    venueName: prefillVenue, startsAt: defaultStart,
    squadSize: 11, pricePerPlayer: 250,
  });

  // Quick-create team inline
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamDraft, setTeamDraft]       = useState({ name: "", sport: "Football", city: "" });
  const [creatingTeam, setCreatingTeam] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    getMyTeams().then(r => {
      setTeams(r.teams);
      if (!form.teamId && r.teams[0]) setForm(c => ({ ...c, teamId: r.teams[0].id, sport: r.teams[0].sport }));
    }).catch(() => {});
  }, [isAuthenticated]);

  if (!authLoading && !isAuthenticated) {
    return <main><div className="page-shell"><AuthPanel title="Sign in to create a match" /></div></main>;
  }
  if (authLoading) return <main><Loader label="Loading…" /></main>;

  const F = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(c => ({ ...c, [k]: e.target.value }));

  const handleCreate = async () => {
    if (!form.teamId)       { setMsg("Select a team first."); return; }
    if (!form.title.trim()) { setMsg("Enter a match title."); return; }
    setSub(true); setMsg(null);
    try {
      const res = await createMatch({
        ...form,
        venueAddress: "", notes: "", visibility: "PUBLIC",
        paymentDueAt: toLDT(new Date(Date.now() + 24 * 60 * 60 * 1000)),
        lockAt:       toLDT(new Date(Date.now() + 36 * 60 * 60 * 1000)),
        startsAt: new Date(form.startsAt).toISOString(),
        publishNow: true,
      });
      setCreatedId(String(res.match.id));
    } catch (e) { setMsg(e instanceof Error ? e.message : "Failed"); }
    finally { setSub(false); }
  };

  const handleCreateTeam = async () => {
    if (!teamDraft.name.trim()) return;
    setCreatingTeam(true);
    try {
      await createTeam(teamDraft);
      const r = await getMyTeams();
      setTeams(r.teams);
      const last = r.teams[r.teams.length - 1];
      if (last) setForm(c => ({ ...c, teamId: last.id }));
      setShowTeamForm(false);
      setTeamDraft({ name: "", sport: "Football", city: "" });
    } finally { setCreatingTeam(false); }
  };

  const shareWhatsApp = () => {
    if (!createdId) return;
    const link    = `${window.location.origin}/p/${createdId}`;
    const d       = new Date(form.startsAt);
    const dateStr = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const price   = form.pricePerPlayer > 0 ? `💰 ₹${form.pricePerPlayer}\n` : "";
    const txt     = `🏏 *${form.title}*\n📅 ${dateStr} at ${timeStr}\n📍 ${form.venueName || "TBD"}\n${price}\nCan you play?\n👉 ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank");
  };

  const copyLink = () => {
    if (!createdId) return;
    void navigator.clipboard.writeText(`${window.location.origin}/p/${createdId}`);
  };

  // ── POST-CREATE: share screen ──────────────────────────────────────────────
  if (createdId) {
    return (
      <main>
        <div className="page-shell animate-in">
          <section style={{ textAlign: "center", padding: "1.5rem 0 0.5rem" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "0.5rem" }}>🎉</div>
            <h1 className="title-lg">Match created!</h1>
            <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.9rem" }}>
              Share with your players to start filling the squad.
            </p>
          </section>

          {/* WhatsApp — primary action */}
          <button onClick={shareWhatsApp} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
            width: "100%", padding: "1.1rem", background: "#25D366", color: "#fff",
            border: "none", borderRadius: "var(--radius-lg)", cursor: "pointer",
            fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem",
            boxShadow: "0 4px 20px #25D36650",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Share to WhatsApp
          </button>

          <div className="grid grid-2" style={{ gap: "0.6rem" }}>
            <Button variant="ghost" onClick={copyLink} block>📋 Copy Link</Button>
            <Button variant="ghost" onClick={() => router.push(`/match/control?matchId=${createdId}`)} block>Captain Panel</Button>
          </div>

          <Button variant="ghost" onClick={() => router.push("/dashboard")} block>← Home</Button>
        </div>
      </main>
    );
  }

  // ── FORM ──────────────────────────────────────────────────────────────────
  return (
    <main>
      <div className="page-shell">
        <section className="hero-panel animate-in">
          <p className="eyebrow">New Match</p>
          <h1 className="title-lg" style={{ marginTop: "0.25rem" }}>Set the fixture</h1>
          <p className="muted" style={{ marginTop: "0.3rem", fontSize: "0.88rem" }}>
            Takes 30 seconds. After creating you&apos;ll get a share link for WhatsApp.
          </p>
        </section>

        <div className="panel animate-in">
          <div className="form-grid">

            {/* Team */}
            <label className="label">
              Team
              {teams.length > 0 ? (
                <select className="select" value={form.teamId} onChange={F("teamId")}>
                  <option value="">Select team…</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              ) : (
                <div style={{ padding: "0.8rem", background: "var(--surface-muted)", borderRadius: "var(--radius-sm)", border: "1px dashed var(--line)", fontSize: "0.88rem", color: "var(--text-muted)" }}>
                  No teams yet.{" "}
                  <button onClick={() => setShowTeamForm(true)} style={{ all: "unset", cursor: "pointer", color: "var(--primary)", fontWeight: 700 }}>
                    Create one →
                  </button>
                </div>
              )}
            </label>

            {/* Inline team create */}
            {showTeamForm && (
              <div style={{ padding: "0.875rem", background: "var(--surface-muted)", borderRadius: "var(--radius-sm)", display: "grid", gap: "0.6rem", border: "1px solid var(--line)" }}>
                <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem" }}>Quick create team</p>
                <input className="input" placeholder="Team name" value={teamDraft.name} onChange={e => setTeamDraft(d => ({ ...d, name: e.target.value }))} />
                <div className="grid grid-2" style={{ gap: "0.5rem" }}>
                  <input className="input" placeholder="City" value={teamDraft.city} onChange={e => setTeamDraft(d => ({ ...d, city: e.target.value }))} />
                  <select className="select" value={teamDraft.sport} onChange={e => setTeamDraft(d => ({ ...d, sport: e.target.value }))}>
                    {SPORT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="grid grid-2" style={{ gap: "0.5rem" }}>
                  <Button onClick={() => void handleCreateTeam()} loading={creatingTeam}>Create</Button>
                  <Button variant="ghost" onClick={() => setShowTeamForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {teams.length > 0 && (
              <button onClick={() => setShowTeamForm(v => !v)} style={{ all: "unset", cursor: "pointer", fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600, textAlign: "right" }}>
                + New team
              </button>
            )}

            {/* Title */}
            <label className="label">
              Match title
              <input className="input" placeholder="Sunday League — Week 4" value={form.title} onChange={F("title")} />
            </label>

            {/* Date/time */}
            <label className="label">
              Date &amp; Time
              <input type="datetime-local" className="input" value={form.startsAt} onChange={F("startsAt")} />
            </label>

            {/* Location */}
            <label className="label">
              Location
              <input className="input" placeholder="Nehru Stadium, Chennai" value={form.venueName} onChange={F("venueName")} />
            </label>

            {/* Squad + cost */}
            <div className="grid grid-2" style={{ gap: "0.6rem" }}>
              <label className="label">
                Squad size
                <input type="number" className="input" min={2} max={50} value={form.squadSize}
                  onChange={e => setForm(c => ({ ...c, squadSize: Number(e.target.value) }))} />
              </label>
              <label className="label">
                Cost per player (₹)
                <input type="number" className="input" min={0} value={form.pricePerPlayer}
                  onChange={e => setForm(c => ({ ...c, pricePerPlayer: Number(e.target.value) }))} />
              </label>
            </div>

            <Button onClick={() => void handleCreate()} loading={submitting} size="lg" block>
              Create &amp; Get Share Link
            </Button>

            {msg && <p className="message-strip error" role="alert">{msg}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CreateMatchPage() {
  return (
    <Suspense fallback={<main><Loader label="Loading…" /></main>}>
      <CreateMatchInner />
    </Suspense>
  );
}
