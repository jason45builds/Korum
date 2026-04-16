"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MatchOverview } from "@/components/dashboard/MatchOverview";
import { PendingPayments } from "@/components/dashboard/PendingPayments";
import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";
import { createTeam, getMyTeams, joinTeam } from "@/services/api/team";
import type { TeamDetails } from "@korum/types/team";

export default function DashboardPage() {
  const { profile, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { dashboardMatches, pendingPayments, loading: matchLoading, loadDashboard } = useMatch();
  const [teams, setTeams] = useState<TeamDetails[]>([]);
  const [createMsg, setCreateMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [joinMsg, setJoinMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [joiningTeam, setJoiningTeam] = useState(false);
  const [teamDraft, setTeamDraft] = useState({ name: "", sport: "Football", city: "" });
  const [inviteCode, setInviteCode] = useState("");

  const loadTeams = async () => {
    const response = await getMyTeams();
    setTeams(response.teams);
  };

  useEffect(() => {
    if (isAuthenticated) {
      void Promise.all([loadDashboard(), loadTeams()]).catch(() =>
        setCreateMsg({ text: "Could not load dashboard.", error: true }),
      );
    }
  }, [isAuthenticated, loadDashboard]);

  // Auth resolved as unauthenticated — show sign in immediately
  if (!authLoading && !isAuthenticated) {
    return (
      <main>
        <div className="page-shell">
          <AuthPanel title="Sign in to open your dashboard" />
        </div>
      </main>
    );
  }

  // Still checking auth
  if (authLoading) {
    return <main><Loader label="Loading dashboard…" /></main>;
  }

  // Authenticated but loading match data for the first time
  if (matchLoading && dashboardMatches.length === 0) {
    return <main><Loader label="Loading your matches…" /></main>;
  }

  const handleCreateTeam = async () => {
    if (!teamDraft.name.trim()) { setCreateMsg({ text: "Enter a team name.", error: true }); return; }
    setCreatingTeam(true);
    setCreateMsg(null);
    try {
      const res = await createTeam(teamDraft);
      setCreateMsg({ text: `Team "${res.team.name}" created!`, error: false });
      setTeamDraft({ name: "", sport: "Football", city: "" });
      await loadTeams();
    } catch (err) {
      setCreateMsg({ text: err instanceof Error ? err.message : "Could not create team.", error: true });
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!inviteCode.trim()) { setJoinMsg({ text: "Enter an invite code.", error: true }); return; }
    setJoiningTeam(true);
    setJoinMsg(null);
    try {
      const res = await joinTeam({ inviteCode });
      setJoinMsg({ text: `Joined "${res.team.name}"!`, error: false });
      setInviteCode("");
      await loadTeams();
    } catch (err) {
      setJoinMsg({ text: err instanceof Error ? err.message : "Could not join team.", error: true });
    } finally {
      setJoiningTeam(false);
    }
  };

  return (
    <main>
      <div className="page-shell">
        <DashboardHeader profile={profile} onSignOut={() => void signOut()} />

        <div className="grid grid-2">
          <Card eyebrow="Teams" title="Create a team">
            <div className="form-grid">
              <label className="label">
                Team name
                <input className="input" placeholder="FC Sunday Warriors" value={teamDraft.name}
                  onChange={(e) => setTeamDraft((c) => ({ ...c, name: e.target.value }))} />
              </label>
              <label className="label">
                Sport
                <input className="input" value={teamDraft.sport}
                  onChange={(e) => setTeamDraft((c) => ({ ...c, sport: e.target.value }))} />
              </label>
              <label className="label">
                City
                <input className="input" placeholder="Chennai" value={teamDraft.city}
                  onChange={(e) => setTeamDraft((c) => ({ ...c, city: e.target.value }))} />
              </label>
              <Button onClick={() => void handleCreateTeam()} loading={creatingTeam} block>
                Create Team
              </Button>
              {createMsg && (
                <p className={`message-strip${createMsg.error ? " error" : " success"}`} role={createMsg.error ? "alert" : "status"}>
                  {createMsg.text}
                </p>
              )}
            </div>
          </Card>

          <Card eyebrow="Teams" title="Join a team">
            <div className="form-grid">
              <label className="label">
                Invite code
                <input className="input" placeholder="ABC123" value={inviteCode}
                  style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())} />
              </label>
              <Button variant="secondary" onClick={() => void handleJoinTeam()} loading={joiningTeam} block>
                Join Team
              </Button>
              {joinMsg && (
                <p className={`message-strip${joinMsg.error ? " error" : " success"}`} role={joinMsg.error ? "alert" : "status"}>
                  {joinMsg.text}
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Your Teams */}
        <section className="panel animate-in" style={{ display: "grid", gap: "1rem" }}>
          <div className="row-between">
            <div>
              <p className="eyebrow">Your Teams</p>
              <h3 className="title-md">Squads</h3>
            </div>
            <Link href="/create/match">
              <Button size="sm">+ Match</Button>
            </Link>
          </div>
          {teams.length === 0 ? (
            <p className="muted" style={{ fontSize: "0.9rem", textAlign: "center", padding: "1rem 0" }}>
              No teams yet. Create or join one above.
            </p>
          ) : (
            <div className="list">
              {teams.map((team) => (
                <div key={team.id} className="list-row">
                  <div>
                    <strong>{team.name}</strong>
                    <div className="faint" style={{ fontSize: "0.82rem", marginTop: "0.1rem" }}>
                      {team.city} · {team.sport}
                    </div>
                  </div>
                  <Link href={`/team/${team.id}`}>
                    <Button variant="ghost" size="sm">Open →</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Matches */}
        <section style={{ display: "grid", gap: "0.75rem" }}>
          <p className="eyebrow" style={{ marginBottom: 0 }}>Match Overview</p>
          <MatchOverview matches={dashboardMatches} />
        </section>

        <PendingPayments payments={pendingPayments} />
      </div>
    </main>
  );
}
