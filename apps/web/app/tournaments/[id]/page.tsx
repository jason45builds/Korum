"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/shared/Loader";
import { getMyTeams } from "@/services/api/team";
import type { TeamDetails } from "@korum/types/team";

type Tournament = {
  id: string; name: string; description: string | null; sport: string;
  format: string; status: string; city: string; venue_name: string | null;
  starts_on: string; ends_on: string | null; registration_closes: string | null;
  entry_fee: number; prize_pool: number; max_teams: number; min_teams: number;
  join_code: string; organizer_id: string; rules: string | null;
};
type Standing = {
  team_id: string; played: number; won: number; drawn: number; lost: number;
  points: number; nrr: number; position: number | null;
  teams: { name: string };
};
type Fixture = {
  id: string; round: number; round_name: string | null; fixture_date: string | null;
  status: string; home_score: number | null; away_score: number | null;
  result_summary: string | null; is_draw: boolean;
  home: { name: string } | null; away: { name: string } | null;
  winner_team_id: string | null;
};
type Registration = {
  id: string; team_id: string; status: string; teams: { name: string };
};
type Announcement = {
  id: string; title: string; body: string; is_pinned: boolean; created_at: string;
  users: { display_name: string | null; full_name: string | null } | null;
};

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft", REGISTRATION_OPEN: "Open", REGISTRATION_CLOSED: "Reg. Closed",
  ONGOING: "Live", COMPLETED: "Completed",
};

const FORMAT_LABELS: Record<string, string> = {
  LEAGUE: "League", KNOCKOUT: "Knockout", GROUP_KNOCKOUT: "Group + Knockout", ROUND_ROBIN: "Round Robin",
};

type Tab = "overview" | "standings" | "fixtures" | "teams";

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { profile, isAuthenticated } = useAuth();

  const [tournament,    setTournament]    = useState<Tournament | null>(null);
  const [standings,     setStandings]     = useState<Standing[]>([]);
  const [fixtures,      setFixtures]      = useState<Fixture[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState<Tab>("overview");
  const [myTeams,       setMyTeams]       = useState<TeamDetails[]>([]);
  const [regTeamId,     setRegTeamId]     = useState("");
  const [registering,   setRegistering]   = useState(false);
  const [regMsg,        setRegMsg]        = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void load();
    if (isAuthenticated) void getMyTeams().then(r => setMyTeams(r.teams)).catch(() => {});
  }, [id, isAuthenticated]);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/tournaments/${id}`, { credentials: "same-origin" });
      const data = await res.json() as {
        tournament: Tournament; standings: Standing[];
        fixtures: Fixture[]; registrations: Registration[];
        announcements: Announcement[];
      };
      setTournament(data.tournament);
      setStandings(data.standings ?? []);
      setFixtures(data.fixtures ?? []);
      setRegistrations(data.registrations ?? []);
      setAnnouncements(data.announcements ?? []);
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!regTeamId) { setRegMsg("Select a team to register"); return; }
    setRegistering(true); setRegMsg(null);
    try {
      const res  = await fetch(`/api/tournaments/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ teamId: regTeamId }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error);
      setRegMsg("Registration submitted! Waiting for organiser approval.");
      await load();
    } catch (e) {
      setRegMsg(e instanceof Error ? e.message : "Registration failed");
    } finally { setRegistering(false); }
  };

  if (loading) return <main><Loader label="Loading tournament…" /></main>;
  if (!tournament) return <main><div className="page"><p>Tournament not found.</p></div></main>;

  const isOrganizer = profile?.id === tournament.organizer_id;
  const statusLabel = STATUS_LABELS[tournament.status] ?? tournament.status;
  const isOpen      = tournament.status === "REGISTRATION_OPEN";
  const groupedFixtures = fixtures.reduce((acc, f) => {
    const key = f.round_name ?? `Round ${f.round}`;
    (acc[key] = acc[key] ?? []).push(f);
    return acc;
  }, {} as Record<string, Fixture[]>);

  return (
    <main>
      <div className="page">

        {/* Header */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ height: 5, background: tournament.status === "ONGOING" ? "var(--blue)" : tournament.status === "REGISTRATION_OPEN" ? "var(--green)" : "var(--line)" }} />
          <div style={{ padding: "16px 16px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(18px,5vw,24px)", lineHeight: 1.2 }}>
                {tournament.name}
              </h1>
              <span style={{ padding: "3px 10px", borderRadius: "var(--r-full)", background: isOpen ? "var(--green-soft)" : "var(--surface-2)", border: "1px solid", borderColor: isOpen ? "var(--green-border)" : "var(--line)", color: isOpen ? "#166534" : "var(--text-3)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                {statusLabel}
              </span>
            </div>
            <p className="t-caption">📍 {tournament.city}{tournament.venue_name ? ` · ${tournament.venue_name}` : ""}</p>
            {tournament.description && (
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{tournament.description}</p>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 14 }}>
              {[
                { v: tournament.sport,                          l: "Sport" },
                { v: FORMAT_LABELS[tournament.format] ?? tournament.format, l: "Format" },
                { v: fmtDate(tournament.starts_on),            l: "Starts" },
                { v: `${registrations.length}/${tournament.max_teams}`, l: "Teams" },
              ].map(({ v, l }) => (
                <div key={l} style={{ textAlign: "center", padding: "8px 4px", background: "var(--surface-2)", borderRadius: "var(--r-md)" }}>
                  <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>{v}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-4)" }}>{l}</p>
                </div>
              ))}
            </div>

            {(tournament.entry_fee > 0 || tournament.prize_pool > 0) && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {tournament.entry_fee > 0 && (
                  <span style={{ padding: "4px 12px", borderRadius: "var(--r-full)", background: "var(--amber-soft)", border: "1px solid var(--amber-border)", color: "#92400e", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12 }}>
                    ₹{tournament.entry_fee} entry
                  </span>
                )}
                {tournament.prize_pool > 0 && (
                  <span style={{ padding: "4px 12px", borderRadius: "var(--r-full)", background: "var(--green-soft)", border: "1px solid var(--green-border)", color: "#166534", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12 }}>
                    🏆 ₹{tournament.prize_pool} prize pool
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Organizer actions */}
        {isOrganizer && (
          <div style={{ display: "flex", gap: 8 }}>
            {tournament.status === "DRAFT" && (
              <button onClick={async () => {
                await fetch(`/api/tournaments`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ tournamentId: id, status: "REGISTRATION_OPEN" }) });
                await load();
              }} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "var(--r-md)", background: "var(--green)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Open Registration
              </button>
            )}
            {tournament.status === "REGISTRATION_OPEN" && (
              <button onClick={async () => {
                await fetch(`/api/tournaments`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ tournamentId: id, status: "ONGOING" }) });
                await load();
              }} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "var(--r-md)", background: "var(--blue)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Start Tournament
              </button>
            )}
          </div>
        )}

        {/* Register CTA */}
        {isOpen && isAuthenticated && !isOrganizer && (
          <div className="card card-pad" style={{ background: "var(--green-soft)", border: "1.5px solid var(--green-border)", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--green)" }}>
              Registration is open!
            </p>
            {myTeams.length > 0 ? (
              <>
                <select className="select" value={regTeamId} onChange={e => setRegTeamId(e.target.value)}>
                  <option value="">Select your team…</option>
                  {myTeams.filter(t => t.sport === tournament.sport || !tournament.sport).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {regMsg && <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: regMsg.includes("submitted") ? "var(--green)" : "var(--red)" }}>{regMsg}</p>}
                <button onClick={() => void handleRegister()} disabled={registering || !regTeamId}
                  style={{ padding: "12px", border: "none", borderRadius: "var(--r-lg)", background: "var(--green)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, cursor: "pointer", opacity: registering ? 0.7 : 1 }}>
                  {registering ? "Registering…" : "Register Team →"}
                </button>
              </>
            ) : (
              <p className="t-body">You need a {tournament.sport} team to register. <a href="/teams" style={{ color: "var(--blue)", fontWeight: 700 }}>Create one →</a></p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="tab-bar">
          {(["overview", "standings", "fixtures", "teams"] as Tab[]).map(t => (
            <button key={t} className={`tab ${tab === t ? "tab--active" : ""}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <>
            {announcements.map(a => (
              <div key={a.id} className="card" style={{ padding: "14px 16px", borderLeft: a.is_pinned ? "3px solid var(--blue)" : "none" }}>
                <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>
                  {a.is_pinned && "📌 "}{a.title}
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{a.body}</p>
                <p className="t-caption" style={{ marginTop: 6 }}>
                  {a.users?.display_name ?? a.users?.full_name ?? "Organiser"} · {fmtDate(a.created_at)}
                </p>
              </div>
            ))}
            {tournament.rules && (
              <div className="card card-pad">
                <p style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>📋 Rules</p>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{tournament.rules}</p>
              </div>
            )}
            {!announcements.length && !tournament.rules && (
              <div className="card card-pad" style={{ textAlign: "center" }}>
                <p className="t-caption">No announcements yet. Check back soon.</p>
              </div>
            )}
          </>
        )}

        {/* STANDINGS */}
        {tab === "standings" && (
          standings.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center" }}>
              <p className="t-caption">Standings will appear once matches are played.</p>
            </div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}>
                    {["#", "Team", "P", "W", "L", "Pts"].map(h => (
                      <th key={h} style={{ padding: "10px 10px", fontFamily: "var(--font-display)", fontWeight: 700, textAlign: h === "Team" ? "left" : "center", fontSize: 12, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => (
                    <tr key={s.team_id} style={{ borderBottom: "1px solid var(--line)", background: i === 0 ? "var(--green-soft)" : "transparent" }}>
                      <td style={{ padding: "10px", textAlign: "center", fontFamily: "var(--font-display)", fontWeight: 700 }}>{s.position ?? i + 1}</td>
                      <td style={{ padding: "10px", fontFamily: "var(--font-display)", fontWeight: 700 }}>{s.teams?.name ?? "—"}</td>
                      <td style={{ padding: "10px", textAlign: "center" }}>{s.played}</td>
                      <td style={{ padding: "10px", textAlign: "center", color: "var(--green)", fontWeight: 700 }}>{s.won}</td>
                      <td style={{ padding: "10px", textAlign: "center", color: "var(--red)" }}>{s.lost}</td>
                      <td style={{ padding: "10px", textAlign: "center", fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--blue)" }}>{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* FIXTURES */}
        {tab === "fixtures" && (
          Object.keys(groupedFixtures).length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center" }}>
              <p className="t-caption">Fixtures have not been scheduled yet.</p>
            </div>
          ) : (
            Object.entries(groupedFixtures).map(([round, roundFixtures]) => (
              <div key={round}>
                <p className="section-label" style={{ marginBottom: 8 }}>{round}</p>
                {roundFixtures.map(f => (
                  <div key={f.id} className="card" style={{ padding: "12px 16px", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ flex: 1, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, textAlign: "right" }}>{f.home?.name ?? "TBD"}</span>
                      <div style={{ textAlign: "center", minWidth: 60 }}>
                        {f.status === "COMPLETED" ? (
                          <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 18 }}>
                            {f.home_score ?? 0} – {f.away_score ?? 0}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>
                            {f.fixture_date ? new Date(f.fixture_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "vs"}
                          </span>
                        )}
                      </div>
                      <span style={{ flex: 1, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{f.away?.name ?? "TBD"}</span>
                    </div>
                    {f.result_summary && (
                      <p className="t-caption" style={{ marginTop: 6, textAlign: "center" }}>{f.result_summary}</p>
                    )}
                  </div>
                ))}
              </div>
            ))
          )
        )}

        {/* TEAMS */}
        {tab === "teams" && (
          registrations.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center" }}>
              <p className="t-caption">No teams registered yet. Be the first!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {registrations.map((r, i) => (
                <div key={r.id} className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 16, color: "var(--text-3)", width: 28 }}>#{i + 1}</span>
                  <span style={{ flex: 1, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{r.teams?.name ?? "—"}</span>
                  <span style={{ padding: "3px 10px", borderRadius: "var(--r-full)", background: r.status === "APPROVED" ? "var(--green-soft)" : "var(--amber-soft)", border: "1px solid", borderColor: r.status === "APPROVED" ? "var(--green-border)" : "var(--amber-border)", color: r.status === "APPROVED" ? "#166534" : "#92400e", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11 }}>
                    {r.status === "APPROVED" ? "Confirmed" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </main>
  );
}
