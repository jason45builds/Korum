"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import Link from "next/link";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";
import { getMyTeams } from "@/services/api/team";
import type { MatchSummary } from "@korum/types/match";
import type { TeamDetails } from "@korum/types/team";

type PendingAv = {
  id: string;
  availability_checks: {
    id: string; match_date: string; match_time: string | null;
    venue_hint: string | null; expires_at: string;
  };
};

function fmtShort(s: string) {
  if (!s) return "";
  try { return new Date(s).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return s; }
}

export default function HomePage() {
  const { profile, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { dashboardMatches, pendingPayments, loading: matchLoading, loadDashboard } = useMatch();
  const [teams, setTeams]       = useState<TeamDetails[]>([]);
  const [pendingAv, setPendingAv] = useState<PendingAv[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadDashboard();
    void getMyTeams().then(r => setTeams(r.teams)).catch(() => {});
    void fetch("/api/availability-check", { credentials: "same-origin" })
      .then(r => r.json())
      .then((d: { pending?: PendingAv[] }) => setPendingAv(d.pending ?? []))
      .catch(() => {});
  }, [isAuthenticated]);

  // ── Landing (not signed in) ────────────────────────────────────────────────
  if (!authLoading && !isAuthenticated) {
    return (
      <main>
        <div className="page-shell">
          <section className="hero-panel animate-in">
            <p className="eyebrow">Match Readiness</p>
            <h1 className="title-xl" style={{ marginTop: "0.35rem", marginBottom: "0.6rem" }}>
              Build the squad before kickoff.
            </h1>
            <p className="muted" style={{ fontSize: "0.93rem" }}>
              Captain shares a link. Players tap YES and pay. Everyone knows who&apos;s in.
            </p>
            <div className="cluster" style={{ marginTop: "1.25rem" }}>
              <Link href="/match/join"><Button size="lg">Join a Match</Button></Link>
              <Link href="/create/match"><Button variant="secondary" size="lg">Create Match</Button></Link>
            </div>
          </section>

          <div className="grid grid-3">
            {[
              { n: "01", icon: "📣", title: "Share link", body: "One message to WhatsApp" },
              { n: "02", icon: "💰", title: "Players pay", body: "YES → pay → captain confirms" },
              { n: "03", icon: "🔒", title: "Squad locks", body: "Everyone knows the match is on" },
            ].map(({ n, icon, title, body }) => (
              <div key={n} className="panel animate-in" style={{ display: "grid", gap: "0.4rem" }}>
                <span style={{ fontSize: "1.5rem" }}>{icon}</span>
                <p className="eyebrow" style={{ color: "var(--text-faint)" }}>{n}</p>
                <strong style={{ fontFamily: "var(--font-display)", fontSize: "0.9rem" }}>{title}</strong>
                <p className="muted" style={{ fontSize: "0.8rem" }}>{body}</p>
              </div>
            ))}
          </div>

          <AuthPanel />
        </div>
      </main>
    );
  }

  if (authLoading) return <main><Loader label="Loading…" /></main>;

  // ── Signed in ─────────────────────────────────────────────────────────────
  const upcoming      = dashboardMatches.filter(m => ["RSVP_OPEN","PAYMENT_PENDING","LOCKED","READY"].includes(m.status));
  const captainMatches= upcoming.filter(m => m.captainId === profile?.id);
  const playerMatches = upcoming.filter(m => m.captainId !== profile?.id);
  const urgentCount   = pendingPayments.length + pendingAv.length;

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  };

  return (
    <main>
      <div className="page-shell">

        {/* ── Header ── */}
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.25rem 0" }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-faint)" }}>{greeting()}</p>
            <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.35rem", fontWeight: 800 }}>
              {profile?.displayName ?? "Hey there"}
            </h1>
          </div>
          <button onClick={() => void signOut()} style={{ all: "unset", cursor: "pointer", fontSize: "0.78rem", color: "var(--text-faint)", padding: "0.35rem 0.7rem", border: "1px solid var(--line)", borderRadius: "999px" }}>
            Sign out
          </button>
        </section>

        {/* ── SECTION 1: Urgent actions ── */}
        {urgentCount > 0 && (
          <section style={{ display: "grid", gap: "0.5rem" }}>
            <div className="section-header">
              <span className="section-title" style={{ color: "var(--danger)" }}>⚠️ Action required</span>
            </div>

            {pendingPayments.slice(0, 2).map(p => (
              <div key={p.id} className="action-card action-card--warning animate-in">
                <div className="row" style={{ gap: "0.75rem", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>💰</span>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontFamily: "var(--font-display)", fontSize: "0.9rem", display: "block" }}>
                      Pay ₹{p.amount} to confirm
                    </strong>
                    <span className="faint" style={{ fontSize: "0.8rem" }}>Your spot is not locked yet</span>
                  </div>
                </div>
                <Link href={`/match/${p.matchId}`} style={{ flexShrink: 0 }}>
                  <Button size="sm">Pay Now</Button>
                </Link>
              </div>
            ))}

            {pendingAv.slice(0, 2).map(item => {
              const c = item.availability_checks;
              const d = new Date(c.match_date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
              return (
                <div key={item.id} className="action-card action-card--primary animate-in">
                  <div className="row" style={{ gap: "0.75rem", flex: 1 }}>
                    <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>📋</span>
                    <div>
                      <strong style={{ fontFamily: "var(--font-display)", fontSize: "0.9rem", display: "block" }}>
                        Are you available?
                      </strong>
                      <span className="faint" style={{ fontSize: "0.8rem" }}>{d}{c.match_time ? ` · ${c.match_time}` : ""}{c.venue_hint ? ` · ${c.venue_hint}` : ""}</span>
                    </div>
                  </div>
                  <Link href="/availability" style={{ flexShrink: 0 }}>
                    <Button size="sm" variant="secondary">Respond</Button>
                  </Link>
                </div>
              );
            })}
          </section>
        )}

        {/* ── SECTION 2: Captain matches ── */}
        {captainMatches.length > 0 && (
          <section style={{ display: "grid", gap: "0.5rem" }}>
            <div className="section-header">
              <span className="section-title">Your matches as captain</span>
              <Link href="/matches" className="section-link">See all</Link>
            </div>
            {captainMatches.slice(0, 2).map(m => <CaptainCard key={m.id} match={m} />)}
          </section>
        )}

        {/* ── SECTION 3: Player matches ── */}
        {playerMatches.length > 0 && (
          <section style={{ display: "grid", gap: "0.5rem" }}>
            <div className="section-header">
              <span className="section-title">Upcoming matches</span>
              <Link href="/matches" className="section-link">See all</Link>
            </div>
            {playerMatches.slice(0, 3).map(m => <PlayerCard key={m.id} match={m} />)}
          </section>
        )}

        {/* ── Empty state ── */}
        {!matchLoading && upcoming.length === 0 && urgentCount === 0 && (
          <div className="panel animate-in" style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🏟️</div>
            <h3 className="title-md">No matches yet</h3>
            <p className="muted" style={{ fontSize: "0.88rem", marginTop: "0.35rem" }}>
              Create a match or join one using a link from your captain.
            </p>
            <div className="cluster" style={{ justifyContent: "center", marginTop: "1.25rem", gap: "0.6rem" }}>
              <Link href="/create/match"><Button>Create Match</Button></Link>
              <Link href="/match/join"><Button variant="ghost">Join Match</Button></Link>
            </div>
          </div>
        )}

        {/* ── Teams strip ── */}
        {teams.length > 0 && (
          <section style={{ display: "grid", gap: "0.5rem" }}>
            <div className="section-header">
              <span className="section-title">My teams</span>
              <Link href="/teams" className="section-link">Manage</Link>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {teams.slice(0, 4).map(t => (
                <Link key={t.id} href={`/team/${t.id}`}
                  style={{ padding: "0.45rem 0.85rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "999px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", display: "inline-flex", alignItems: "center", gap: "0.35rem", boxShadow: "var(--shadow-xs)" }}>
                  🏟️ {t.name}
                </Link>
              ))}
              <Link href="/teams"
                style={{ padding: "0.45rem 0.85rem", background: "transparent", border: "1px dashed var(--line)", borderRadius: "999px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-faint)", display: "inline-flex", alignItems: "center" }}>
                + New
              </Link>
            </div>
          </section>
        )}

        {/* ── New user onboarding ── */}
        {teams.length === 0 && upcoming.length === 0 && (
          <div className="panel animate-in" style={{ display: "grid", gap: "0.6rem" }}>
            <p className="eyebrow">Get started</p>
            {[
              { href: "/teams", icon: "🏟️", title: "Create a team", sub: "Add your squad members" },
              { href: "/match/join", icon: "🔗", title: "Join a match", sub: "Open the link your captain sent" },
              { href: "/availability", icon: "📋", title: "Check availability", sub: "See if your captain needs you" },
            ].map(({ href, icon, title, sub }) => (
              <Link key={href} href={href}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.7rem", background: "var(--surface-muted)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
                  <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontFamily: "var(--font-display)", fontSize: "0.88rem", display: "block" }}>{title}</strong>
                    <span className="faint" style={{ fontSize: "0.78rem" }}>{sub}</span>
                  </div>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}

// ── Cards ─────────────────────────────────────────────────────────────────

function CaptainCard({ match }: { match: MatchSummary }) {
  const confirmed = match.confirmedCount ?? 0;
  const total     = match.squadSize ?? 0;
  const pending   = match.pendingCount ?? 0;
  const left      = Math.max(0, total - confirmed);
  const pct       = total > 0 ? Math.min((confirmed / total) * 100, 100) : 0;

  return (
    <Link href={`/match/control?matchId=${match.id}`} style={{ display: "block" }}>
      <div className="panel animate-in" style={{ display: "grid", gap: "0.75rem", cursor: "pointer" }}>
        <div className="row-between">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.98rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{match.title}</div>
            <div className="faint" style={{ fontSize: "0.8rem", marginTop: "0.1rem" }}>{fmtShort(match.startsAt)} · {match.venueName}</div>
          </div>
          <span className="badge badge-blue" style={{ flexShrink: 0 }}>Captain</span>
        </div>

        {/* Status bar mini */}
        <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.82rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>
          <span style={{ color: "var(--success)" }}>✅ {confirmed} confirmed</span>
          {pending > 0 && <span style={{ color: "var(--warning)" }}>⏳ {pending} pending</span>}
          <span style={{ color: "var(--text-faint)" }}>{left} left</span>
        </div>

        <div className="progress-bar">
          <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
        </div>

        <div style={{ fontSize: "0.8rem", color: "var(--primary)", fontFamily: "var(--font-display)", fontWeight: 700 }}>
          Open control panel →
        </div>
      </div>
    </Link>
  );
}

function PlayerCard({ match }: { match: MatchSummary }) {
  const confirmed = match.confirmedCount ?? 0;
  const total     = match.squadSize ?? 0;
  const isLocked  = match.status === "LOCKED" || match.status === "READY";
  const cls       = isLocked ? "badge-success" : "badge-warning";

  return (
    <Link href={`/match/${match.id}`} style={{ display: "block" }}>
      <div className="panel animate-in" style={{ display: "grid", gap: "0.6rem", cursor: "pointer" }}>
        <div className="row-between">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.98rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{match.title}</div>
            <div className="faint" style={{ fontSize: "0.8rem", marginTop: "0.1rem" }}>{fmtShort(match.startsAt)} · {match.venueName}</div>
          </div>
          <span className={`badge ${cls}`} style={{ flexShrink: 0 }}>{isLocked ? "Locked" : "Open"}</span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.82rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>
          <span style={{ color: "var(--success)" }}>👥 {confirmed}/{total}</span>
          {match.pricePerPlayer > 0 && <span style={{ color: "var(--text-muted)" }}>₹{match.pricePerPlayer}</span>}
        </div>
      </div>
    </Link>
  );
}
