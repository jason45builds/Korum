"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import Link from "next/link";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { useAuth } from "@/hooks/useAuth";
import { createTeam, getMyTeams, joinTeam } from "@/services/api/team";
import { SPORT_OPTIONS } from "@/lib/constants";
import type { TeamDetails } from "@korum/types/team";

type Sheet = "none" | "create" | "join";

export default function TeamsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [teams, setTeams]   = useState<TeamDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet]   = useState<Sheet>("none");
  const [draft, setDraft]   = useState({ name: "", sport: "Football", city: "" });
  const [code, setCode]     = useState("");
  const [msg, setMsg]       = useState<{ text: string; error: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (isAuthenticated) void load(); }, [isAuthenticated]);

  const load = async () => {
    setLoading(true);
    try { const r = await getMyTeams(); setTeams(r.teams); } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!draft.name.trim()) { setMsg({ text: "Enter a team name.", error: true }); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await createTeam(draft);
      setMsg({ text: `"${r.team.name}" created!`, error: false });
      setDraft({ name: "", sport: "Football", city: "" });
      setSheet("none");
      await load();
    } catch (e) { setMsg({ text: e instanceof Error ? e.message : "Failed", error: true }); }
    finally { setSaving(false); }
  };

  const handleJoin = async () => {
    if (!code.trim()) { setMsg({ text: "Enter an invite code.", error: true }); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await joinTeam({ inviteCode: code.trim() });
      setMsg({ text: `Joined "${r.team.name}"!`, error: false });
      setCode(""); setSheet("none");
      await load();
    } catch (e) { setMsg({ text: e instanceof Error ? e.message : "Failed", error: true }); }
    finally { setSaving(false); }
  };

  if (!authLoading && !isAuthenticated) {
    return <main><div className="page"><AuthPanel title="Sign in to see your teams" /></div></main>;
  }
  if (authLoading || loading) return <main><Loader label="Loading…" /></main>;

  return (
    <main>
      <div className="page">

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 className="t-h2">Teams</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn--ghost btn--sm"
              onClick={() => setSheet(s => s === "join" ? "none" : "join")}>
              Join
            </button>
            <button className="btn btn--primary btn--sm"
              onClick={() => setSheet(s => s === "create" ? "none" : "create")}>
              + New
            </button>
          </div>
        </div>

        {msg && <p className={`msg${msg.error ? " error" : " success"}`}>{msg.text}</p>}

        {/* Create sheet */}
        {sheet === "create" && (
          <div className="card card-pad animate-pop">
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, marginBottom: 14 }}>
              Create team
            </p>
            <div className="form-stack">
              <div className="field">
                <label className="field-label">Team name</label>
                <input className="input" placeholder="FC Sunday Warriors" value={draft.name}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label className="field-label">Sport</label>
                  <select className="select" value={draft.sport}
                    onChange={e => setDraft(d => ({ ...d, sport: e.target.value }))}>
                    {SPORT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">City</label>
                  <input className="input" placeholder="Chennai" value={draft.city}
                    onChange={e => setDraft(d => ({ ...d, city: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button className="btn btn--primary btn--block" onClick={() => void handleCreate()} disabled={saving}>
                  {saving ? "Creating…" : "Create"}
                </button>
                <button className="btn btn--ghost btn--block" onClick={() => setSheet("none")}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Join sheet */}
        {sheet === "join" && (
          <div className="card card-pad animate-pop">
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, marginBottom: 14 }}>
              Join with invite code
            </p>
            <div className="form-stack">
              <input className="input" placeholder="ABC123"
                value={code} style={{ letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, textAlign: "center" }}
                onChange={e => setCode(e.target.value.toUpperCase())} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button className="btn btn--secondary btn--block" onClick={() => void handleJoin()} disabled={saving}>
                  {saving ? "Joining…" : "Join Team"}
                </button>
                <button className="btn btn--ghost btn--block" onClick={() => setSheet("none")}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Team list */}
        {teams.length === 0 ? (
          <div className="card card-pad" style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏟️</div>
            <h3 className="t-title" style={{ marginBottom: 8 }}>No teams yet</h3>
            <p className="t-body" style={{ color: "var(--text-3)" }}>Create a squad or join with an invite code.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {teams.map(team => (
              <Link key={team.id} href={`/team/${team.id}`}>
                <div className="card" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "var(--blue-soft)", display: "grid", placeItems: "center", fontSize: 20, flexShrink: 0 }}>
                      🏟️
                    </div>
                    <div>
                      <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>{team.name}</p>
                      <p className="t-caption" style={{ marginTop: 2 }}>
                        {team.sport} · {team.city} · {team.members.length} members
                      </p>
                    </div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
