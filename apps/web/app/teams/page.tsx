"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { createTeam, getMyTeams, joinTeam } from "@/services/api/team";
import type { TeamDetails } from "@korum/types/team";

export default function TeamsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [teams, setTeams]       = useState<TeamDetails[]>([]);
  const [loading, setLoading]   = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin]     = useState(false);
  const [draft, setDraft]       = useState({ name: "", sport: "Football", city: "" });
  const [code, setCode]         = useState("");
  const [msg, setMsg]           = useState<{ text: string; error: boolean } | null>(null);
  const [saving, setSaving]     = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setShowCreate(false);
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
      setCode(""); setShowJoin(false);
      await load();
    } catch (e) { setMsg({ text: e instanceof Error ? e.message : "Failed", error: true }); }
    finally { setSaving(false); }
  };

  if (!authLoading && !isAuthenticated) {
    return <main><div className="page-shell"><AuthPanel title="Sign in to see your teams" /></div></main>;
  }
  if (authLoading || loading) return <main><Loader label="Loading teams…" /></main>;

  return (
    <main>
      <div className="page-shell">
        <div className="row-between">
          <div>
            <p className="eyebrow">Teams</p>
            <h1 className="title-lg" style={{ marginTop: "0.2rem" }}>Your squads</h1>
          </div>
          <div className="cluster" style={{ gap: "0.5rem" }}>
            <Button variant="secondary" size="sm" onClick={() => { setShowJoin((v) => !v); setShowCreate(false); }}>Join</Button>
            <Button size="sm" onClick={() => { setShowCreate((v) => !v); setShowJoin(false); }}>+ New</Button>
          </div>
        </div>

        {msg && <p className={`message-strip${msg.error ? " error" : " success"}`}>{msg.text}</p>}

        {/* Create form */}
        {showCreate && (
          <Card eyebrow="New Team" title="Create a squad">
            <div className="form-grid">
              <label className="label">Team name<input className="input" placeholder="FC Sunday Warriors" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} /></label>
              <div className="grid grid-2" style={{ gap: "0.6rem" }}>
                <label className="label">Sport<input className="input" value={draft.sport} onChange={(e) => setDraft((d) => ({ ...d, sport: e.target.value }))} /></label>
                <label className="label">City<input className="input" placeholder="Chennai" value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} /></label>
              </div>
              <Button onClick={() => void handleCreate()} loading={saving} block>Create Team</Button>
            </div>
          </Card>
        )}

        {/* Join form */}
        {showJoin && (
          <Card eyebrow="Join Team" title="Enter invite code">
            <div className="form-grid">
              <label className="label">Invite code
                <input className="input" placeholder="ABC123" value={code} style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
                  onChange={(e) => setCode(e.target.value.toUpperCase())} />
              </label>
              <Button variant="secondary" onClick={() => void handleJoin()} loading={saving} block>Join Team</Button>
            </div>
          </Card>
        )}

        {/* Team list */}
        {teams.length === 0 ? (
          <div className="panel" style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🏟️</div>
            <h3 className="title-md">No teams yet</h3>
            <p className="muted" style={{ fontSize: "0.9rem", marginTop: "0.4rem" }}>Create a squad or join one with an invite code.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {teams.map((team) => (
              <Link key={team.id} href={`/team/${team.id}`} style={{ display: "block" }}>
                <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", cursor: "pointer", transition: "box-shadow 150ms" }}>
                  <div>
                    <strong style={{ fontSize: "1.05rem" }}>{team.name}</strong>
                    <div className="faint" style={{ fontSize: "0.82rem", marginTop: "0.15rem" }}>
                      {team.sport} · {team.city} · {team.members.length} members
                    </div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
