"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [teams, setTeams] = useState<TeamDetails[]>([]);
  const [createTeamMsg, setCreateTeamMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [matchMsg, setMatchMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamDraft, setTeamDraft] = useState({ name: "", sport: "Football", city: "" });
  const [form, setForm] = useState({
    teamId: "",
    title: "",
    sport: "Football",
    venueName: "",
    venueAddress: "",
    startsAt:      toLocalDateTime(new Date(Date.now() + 48 * 60 * 60 * 1000)),
    paymentDueAt:  toLocalDateTime(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    lockAt:        toLocalDateTime(new Date(Date.now() + 36 * 60 * 60 * 1000)),
    squadSize: 10,
    pricePerPlayer: 250,
    visibility: "TEAM" as "PRIVATE" | "TEAM" | "PUBLIC",
    notes: "",
  });

  const loadTeams = async () => {
    const response = await getMyTeams();
    setTeams(response.teams);
    if (!form.teamId && response.teams[0]) {
      setForm((c) => ({ ...c, teamId: response.teams[0].id, sport: response.teams[0].sport }));
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void loadTeams().catch(() =>
        setMatchMsg({ text: "Could not load your teams.", error: true }),
      );
    }
  }, [isAuthenticated]);

  if (!loading && !isAuthenticated) {
    return (
      <main>
        <div className="page-shell">
          <AuthPanel
            title="Captain sign in"
            description="Sign in first so Korum can attach the match to your team."
          />
        </div>
      </main>
    );
  }

  if (loading) return <main><Loader label="Loading…" /></main>;

  const field = (key: keyof typeof form) => ({
    value: String(form[key]),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((c) => ({ ...c, [key]: e.target.value })),
  });

  const handleCreateTeam = async () => {
    if (!teamDraft.name.trim()) {
      setCreateTeamMsg({ text: "Enter a team name.", error: true });
      return;
    }
    setCreatingTeam(true);
    setCreateTeamMsg(null);
    try {
      const res = await createTeam(teamDraft);
      setCreateTeamMsg({ text: `Created "${res.team.name}".`, error: false });
      setTeamDraft({ name: "", sport: "Football", city: "" });
      await loadTeams();
    } catch (error) {
      setCreateTeamMsg({ text: error instanceof Error ? error.message : "Could not create team.", error: true });
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleCreateMatch = async () => {
    if (!form.teamId) {
      setMatchMsg({ text: "Select a team first.", error: true });
      return;
    }
    if (!form.title.trim()) {
      setMatchMsg({ text: "Enter a match title.", error: true });
      return;
    }
    setSubmitting(true);
    setMatchMsg(null);
    try {
      const response = await createMatch({
        ...form,
        startsAt:     new Date(form.startsAt).toISOString(),
        paymentDueAt: form.paymentDueAt ? new Date(form.paymentDueAt).toISOString() : null,
        lockAt:       form.lockAt       ? new Date(form.lockAt).toISOString()       : null,
        publishNow: true,
      });
      router.push(`/match/${String(response.match.id)}`);
    } catch (error) {
      setMatchMsg({ text: error instanceof Error ? error.message : "Could not create match.", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      <div className="page-shell">
        {/* Hero */}
        <section className="hero-panel animate-in">
          <p className="eyebrow">Create Match</p>
          <h1 className="title-lg" style={{ marginTop: "0.4rem" }}>Set the fixture.</h1>
          <p className="muted" style={{ marginTop: "0.4rem", fontSize: "0.9rem" }}>
            Korum moves the match from draft → RSVP → payment → locked automatically.
          </p>
        </section>

        {/* Match form takes full width on mobile, 2-col on desktop */}
        <div className="grid grid-2" style={{ alignItems: "start" }}>

          {/* ── Match Details ── */}
          <Card eyebrow="Match" title="Match Details">
            <div className="form-grid">
              <label className="label">
                Team
                <select className="select" value={form.teamId}
                  onChange={(e) => setForm((c) => ({ ...c, teamId: e.target.value }))}>
                  <option value="">Select a team…</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>

              <label className="label">
                Match title
                <input className="input" placeholder="Sunday League — Week 4" {...field("title")} />
              </label>

              <label className="label">
                Sport
                <select className="select" value={form.sport}
                  onChange={(e) => setForm((c) => ({ ...c, sport: e.target.value }))}>
                  {SPORT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <label className="label">
                Venue name
                <input className="input" placeholder="Nehru Stadium" {...field("venueName")} />
              </label>

              <label className="label">
                Venue address
                <input className="input" placeholder="Anna Salai, Chennai" {...field("venueAddress")} />
              </label>

              <label className="label">
                Kickoff
                <input type="datetime-local" className="input" {...field("startsAt")} />
              </label>

              <label className="label">
                Payment due
                <input type="datetime-local" className="input" {...field("paymentDueAt")} />
              </label>

              <label className="label">
                Lock squad at
                <input type="datetime-local" className="input" {...field("lockAt")} />
              </label>

              {/* Squad size + price side by side */}
              <div className="grid grid-2" style={{ gap: "0.75rem" }}>
                <label className="label">
                  Squad size
                  <input type="number" className="input" min={2} max={100}
                    value={form.squadSize}
                    onChange={(e) => setForm((c) => ({ ...c, squadSize: Number(e.target.value) }))} />
                </label>
                <label className="label">
                  Price / player (₹)
                  <input type="number" className="input" min={0}
                    value={form.pricePerPlayer}
                    onChange={(e) => setForm((c) => ({ ...c, pricePerPlayer: Number(e.target.value) }))} />
                </label>
              </div>

              <label className="label">
                Visibility
                <select className="select" value={form.visibility}
                  onChange={(e) => setForm((c) => ({ ...c, visibility: e.target.value as "PRIVATE" | "TEAM" | "PUBLIC" }))}>
                  <option value="PRIVATE">Private</option>
                  <option value="TEAM">Team only</option>
                  <option value="PUBLIC">Public</option>
                </select>
              </label>

              <label className="label">
                Notes
                <textarea className="textarea" placeholder="Any additional info for players…" {...field("notes")} />
              </label>

              <Button onClick={() => void handleCreateMatch()} loading={submitting} size="lg" block>
                Create Match
              </Button>

              {matchMsg && (
                <p className={`message-strip${matchMsg.error ? " error" : " success"}`}
                  role={matchMsg.error ? "alert" : "status"}>
                  {matchMsg.text}
                </p>
              )}
            </div>
          </Card>

          {/* ── Create Team (sidebar / bottom on mobile) ── */}
          <Card eyebrow="Teams" title="Need a team first?">
            <div className="form-grid">
              <label className="label">
                Team name
                <input className="input" placeholder="FC Sunday Warriors"
                  value={teamDraft.name}
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
                <input className="input" placeholder="Chennai"
                  value={teamDraft.city}
                  onChange={(e) => setTeamDraft((c) => ({ ...c, city: e.target.value }))} />
              </label>
              <Button variant="secondary" onClick={() => void handleCreateTeam()} loading={creatingTeam} block>
                Create Team
              </Button>
              {createTeamMsg && (
                <p className={`message-strip${createTeamMsg.error ? " error" : " success"}`}
                  role={createTeamMsg.error ? "alert" : "status"}>
                  {createTeamMsg.text}
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
