"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SPORT_OPTIONS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { createMatch } from "@/services/api/match";
import { createTeam, getMyTeams } from "@/services/api/team";
import type { TeamDetails } from "@korum/types/team";

const toLocalDateTime = (date: Date) => date.toISOString().slice(0, 16);

export default function CreateMatchPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [teams, setTeams]             = useState<TeamDetails[]>([]);
  const [createTeamMsg, setCreateTeamMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [matchMsg, setMatchMsg]       = useState<{ text: string; error: boolean } | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamDraft, setTeamDraft]     = useState({ name: "", sport: "Football", city: "" });
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null);

  // Pre-fill from availability check redirect
  const prefillDate    = searchParams.get("matchDate") ?? "";
  const prefillTime    = searchParams.get("matchTime") ?? "";
  const prefillVenue   = searchParams.get("venueHint") ?? "";
  const prefillTeamId  = searchParams.get("teamId") ?? "";

  const defaultStartsAt = prefillDate && prefillTime
    ? new Date(`${prefillDate}T${prefillTime}`).toISOString().slice(0, 16)
    : toLocalDateTime(new Date(Date.now() + 48 * 60 * 60 * 1000));

  const [form, setForm] = useState({
    teamId:         prefillTeamId,
    title:          "",
    sport:          "Football",
    venueName:      prefillVenue,
    venueAddress:   "",
    startsAt:       defaultStartsAt,
    paymentDueAt:   toLocalDateTime(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    lockAt:         toLocalDateTime(new Date(Date.now() + 36 * 60 * 60 * 1000)),
    squadSize:      11,
    pricePerPlayer: 250,
    visibility:     "PUBLIC" as "PRIVATE" | "TEAM" | "PUBLIC",
    notes:          "",
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isAuthenticated) return;
    getMyTeams().then((res) => {
      setTeams(res.teams);
      if (!form.teamId && res.teams[0]) {
        setForm((c) => ({ ...c, teamId: res.teams[0].id, sport: res.teams[0].sport }));
      }
    }).catch(() => setMatchMsg({ text: "Could not load teams.", error: true }));
  }, [isAuthenticated]);

  if (!authLoading && !isAuthenticated) {
    return <main><div className="page-shell"><AuthPanel title="Sign in to create a match" /></div></main>;
  }
  if (authLoading) return <main><Loader label="Loading…" /></main>;

  const setField = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((c) => ({ ...c, [key]: e.target.value }));

  const handleCreateTeam = async () => {
    if (!teamDraft.name.trim()) { setCreateTeamMsg({ text: "Enter a team name.", error: true }); return; }
    setCreatingTeam(true); setCreateTeamMsg(null);
    try {
      const res = await createTeam(teamDraft);
      setCreateTeamMsg({ text: `Team "${res.team.name}" created!`, error: false });
      setTeamDraft({ name: "", sport: "Football", city: "" });
      const updated = await getMyTeams();
      setTeams(updated.teams);
      if (!form.teamId && updated.teams[0]) setForm((c) => ({ ...c, teamId: updated.teams[0].id }));
    } catch (err) {
      setCreateTeamMsg({ text: err instanceof Error ? err.message : "Failed", error: true });
    } finally { setCreatingTeam(false); }
  };

  const handleCreate = async () => {
    if (!form.teamId)       { setMatchMsg({ text: "Select a team first.", error: true }); return; }
    if (!form.title.trim()) { setMatchMsg({ text: "Enter a match title.", error: true }); return; }
    setSubmitting(true); setMatchMsg(null);
    try {
      const res = await createMatch({
        ...form,
        startsAt:     new Date(form.startsAt).toISOString(),
        paymentDueAt: form.paymentDueAt ? new Date(form.paymentDueAt).toISOString() : null,
        lockAt:       form.lockAt       ? new Date(form.lockAt).toISOString()       : null,
        publishNow: true,
      });
      const matchId = String(res.match.id);
      setCreatedMatchId(matchId);
      setMatchMsg({ text: "Match created! Share it to fill your squad.", error: false });
    } catch (err) {
      setMatchMsg({ text: err instanceof Error ? err.message : "Failed", error: true });
    } finally { setSubmitting(false); }
  };

  const shareWhatsApp = () => {
    if (!createdMatchId) return;
    const link    = `${window.location.origin}/p/${createdMatchId}`;
    const d       = new Date(form.startsAt);
    const dateStr = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const price   = form.pricePerPlayer > 0 ? `💰 ₹${form.pricePerPlayer}` : "Free";
    const txt     = `⚽ *${form.title}*\n📅 ${dateStr} at ${timeStr}\n📍 ${form.venueName || "TBD"}\n${price}\n\nCan you play?\n👉 ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank");
  };

  // After match creation — show share screen
  if (createdMatchId) {
    return (
      <main>
        <div className="page-shell">
          <section className="hero-panel animate-in" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎉</div>
            <h1 className="title-lg">Match created!</h1>
            <p className="muted" style={{ marginTop: "0.4rem" }}>Share with your team to start filling the squad.</p>
          </section>

          {/* WhatsApp share — primary action */}
          <button
            onClick={shareWhatsApp}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
              width: "100%", padding: "1.1rem", background: "#25D366", color: "#fff",
              border: "none", borderRadius: "var(--radius-lg)", cursor: "pointer",
              fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem",
              boxShadow: "0 4px 20px #25D36655",
            }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Share to WhatsApp
          </button>

          <div className="grid grid-2" style={{ gap: "0.75rem" }}>
            <Button variant="secondary" onClick={() => { void navigator.clipboard.writeText(`${window.location.origin}/p/${createdMatchId}`); }}>
              📋 Copy Link
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/captain/${createdMatchId}`)}>
              Open Captain Panel
            </Button>
          </div>

          <Button variant="ghost" onClick={() => router.push("/dashboard")} block>
            ← Back to Dashboard
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="page-shell">
        <section className="hero-panel animate-in">
          <p className="eyebrow">Create Match</p>
          <h1 className="title-lg" style={{ marginTop: "0.3rem" }}>Set the fixture</h1>
          <p className="muted" style={{ marginTop: "0.3rem", fontSize: "0.9rem" }}>
            Fill the details. After creating, share the link directly to WhatsApp.
          </p>
        </section>

        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <Card eyebrow="Match" title="Match Details">
            <div className="form-grid">
              <label className="label">
                Team
                <select className="select" value={form.teamId}
                  onChange={(e) => setForm((c) => ({ ...c, teamId: e.target.value }))}>
                  <option value="">Select a team…</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <label className="label">
                Match title
                <input className="input" placeholder="Sunday League — Week 4" value={form.title} onChange={setField("title")} />
              </label>
              <label className="label">
                Sport
                <select className="select" value={form.sport} onChange={(e) => setForm((c) => ({ ...c, sport: e.target.value }))}>
                  {SPORT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="label">
                Venue name
                <input className="input" placeholder="Nehru Stadium" value={form.venueName} onChange={setField("venueName")} />
              </label>
              <label className="label">
                Venue address
                <input className="input" placeholder="Anna Salai, Chennai" value={form.venueAddress} onChange={setField("venueAddress")} />
              </label>
              <label className="label">
                Kickoff
                <input type="datetime-local" className="input" value={form.startsAt} onChange={setField("startsAt")} />
              </label>
              <div className="grid grid-2" style={{ gap: "0.75rem" }}>
                <label className="label">
                  Squad size
                  <input type="number" className="input" min={2} max={50} value={form.squadSize}
                    onChange={(e) => setForm((c) => ({ ...c, squadSize: Number(e.target.value) }))} />
                </label>
                <label className="label">
                  Cost per player (₹)
                  <input type="number" className="input" min={0} value={form.pricePerPlayer}
                    onChange={(e) => setForm((c) => ({ ...c, pricePerPlayer: Number(e.target.value) }))} />
                </label>
              </div>
              <label className="label">
                Notes for players
                <textarea className="textarea" style={{ minHeight: "70px" }}
                  placeholder="Kit colour, arrival time, bring water…"
                  value={form.notes} onChange={setField("notes")} />
              </label>
              <Button onClick={() => void handleCreate()} loading={submitting} size="lg" block>
                Create & Get Share Link
              </Button>
              {matchMsg && (
                <p className={`message-strip${matchMsg.error ? " error" : " success"}`}>
                  {matchMsg.text}
                </p>
              )}
            </div>
          </Card>

          <div style={{ display: "grid", gap: "1rem" }}>
            <Card eyebrow="Teams" title="Need a team first?">
              <div className="form-grid">
                <label className="label">
                  Team name
                  <input className="input" placeholder="FC Sunday Warriors" value={teamDraft.name}
                    onChange={(e) => setTeamDraft((c) => ({ ...c, name: e.target.value }))} />
                </label>
                <label className="label">
                  Sport
                  <select className="select" value={teamDraft.sport}
                    onChange={(e) => setTeamDraft((c) => ({ ...c, sport: e.target.value }))}>
                    {SPORT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="label">
                  City
                  <input className="input" placeholder="Chennai" value={teamDraft.city}
                    onChange={(e) => setTeamDraft((c) => ({ ...c, city: e.target.value }))} />
                </label>
                <Button variant="secondary" onClick={() => void handleCreateTeam()} loading={creatingTeam} block>
                  Create Team
                </Button>
                {createTeamMsg && (
                  <p className={`message-strip${createTeamMsg.error ? " error" : " success"}`}>{createTeamMsg.text}</p>
                )}
              </div>
            </Card>

            {/* Flow reminder */}
            <div className="panel" style={{ display: "grid", gap: "0.5rem" }}>
              <p className="eyebrow">How it works</p>
              {[
                "Create match → get a share link",
                "Share link to WhatsApp group",
                "Players tap link → I'm In → Pay",
                "You confirm payments in Captain Panel",
                "Lock squad when full",
              ].map((step, i) => (
                <div key={i} className="row" style={{ gap: "0.6rem", fontSize: "0.88rem" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--primary)", minWidth: "1.2rem" }}>{i + 1}</span>
                  <span className="muted">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
