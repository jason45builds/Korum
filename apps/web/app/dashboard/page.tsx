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

const fmt = (s: string) => {
  if (!s) return "";
  try {
    return new Date(s).toLocaleString("en-IN", {
      weekday: "short", day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return s; }
};

export default function HomePage() {
  const { profile, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { dashboardMatches, pendingPayments, loading: matchLoading, loadDashboard } = useMatch();
  const [teams, setTeams]     = useState<TeamDetails[]>([]);
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

  // ── NOT SIGNED IN — landing ─────────────────────────────────────────────────
  if (!authLoading && !isAuthenticated) {
    return (
      <main>
        <div className="page">
          {/* Hero */}
          <div style={{ padding: "24px 0 8px" }}>
            <p className="t-label" style={{ color: "var(--blue)", marginBottom: 8 }}>Match Readiness Platform</p>
            <h1 className="t-h1" style={{ marginBottom: 10 }}>Build the squad before kickoff.</h1>
            <p className="t-body" style={{ color: "var(--text-3)", marginBottom: 20 }}>
              Captain sends a link. Players tap YES and pay. Everyone knows who&apos;s confirmed.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/match/join">
                <button className="btn btn--primary btn--lg">Join a Match</button>
              </Link>
              <Link href="/create/match">
                <button className="btn btn--secondary btn--lg">Create Match</button>
              </Link>
            </div>
          </div>

          {/* 3-step cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[
              { icon: "📣", n: "1", title: "Share link", sub: "WhatsApp in seconds" },
              { icon: "💰", n: "2", title: "Players pay", sub: "YES → pay → confirmed" },
              { icon: "🔒", n: "3", title: "Squad locks", sub: "Match is on" },
            ].map(({ icon, n, title, sub }) => (
              <div key={n} className="card card-pad-sm animate-in" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <span className="t-label" style={{ color: "var(--text-4)" }}>{n}</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13 }}>{title}</span>
                <span className="t-caption">{sub}</span>
              </div>
            ))}
          </div>

          <AuthPanel />
        </div>
      </main>
    );
  }

  if (authLoading) return <main><Loader label="Loading…" /></main>;

  // ── SIGNED IN ────────────────────────────────────────────────────────────────
  const upcoming       = dashboardMatches.filter(m => ["RSVP_OPEN","PAYMENT_PENDING","LOCKED","READY"].includes(m.status));
  const captainMatches = upcoming.filter(m => m.captainId === profile?.id);
  const playerMatches  = upcoming.filter(m => m.captainId !== profile?.id);
  const urgentCount    = pendingPayments.length + pendingAv.length;

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <main>
      <div className="page">

        {/* ─── Greeting bar ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p className="t-caption">{greet}</p>
            <h2 className="t-h2">{profile?.displayName ?? "Hey there"} 👋</h2>
          </div>
          <button
            onClick={() => void signOut()}
            style={{ background: "none", border: "1px solid var(--line)", borderRadius: "var(--r-full)", padding: "6px 14px", fontSize: 12, fontWeight: 600, color: "var(--text-4)", cursor: "pointer" }}>
            Sign out
          </button>
        </div>

        {/* ─── URGENT ACTIONS ───────────────────────────────────────────── */}
        {urgentCount > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="section-row">
              <span className="section-label" style={{ color: "var(--red)" }}>Action required</span>
            </div>

            {pendingPayments.slice(0, 2).map(p => (
              <div key={p.id} className="action-banner action-banner--amber animate-in">
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>💰</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14 }}>
                      Pay ₹{p.amount} to confirm
                    </p>
                    <p className="t-caption" style={{ marginTop: 2 }}>Your spot is not locked</p>
                  </div>
                </div>
                <Link href={`/match/${p.matchId}`}>
                  <button className="btn btn--primary btn--sm">Pay Now</button>
                </Link>
              </div>
            ))}

            {pendingAv.slice(0, 2).map(item => {
              const c = item.availability_checks;
              const d = new Date(c.match_date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
              return (
                <div key={item.id} className="action-banner action-banner--blue animate-in">
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>📋</span>
                    <div>
                      <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14 }}>
                        Are you available?
                      </p>
                      <p className="t-caption" style={{ marginTop: 2 }}>
                        {d}{c.match_time ? ` · ${c.match_time}` : ""}{c.venue_hint ? ` · ${c.venue_hint}` : ""}
                      </p>
                    </div>
                  </div>
                  <Link href="/availability">
                    <button className="btn btn--secondary btn--sm">Respond</button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── CAPTAIN MATCHES ──────────────────────────────────────────── */}
        {captainMatches.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="section-row">
              <span className="section-label">My Matches</span>
              <Link href="/matches" className="section-action">See all</Link>
            </div>
            {captainMatches.slice(0, 2).map(m => <CaptainMatchCard key={m.id} match={m} />)}
          </div>
        )}

        {/* ─── PLAYER MATCHES ───────────────────────────────────────────── */}
        {playerMatches.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="section-row">
              <span className="section-label">Upcoming</span>
              <Link href="/matches" className="section-action">See all</Link>
            </div>
            {playerMatches.slice(0, 3).map(m => <PlayerMatchCard key={m.id} match={m} />)}
          </div>
        )}

        {/* ─── EMPTY STATE ──────────────────────────────────────────────── */}
        {!matchLoading && upcoming.length === 0 && urgentCount === 0 && (
          <div className="card card-pad animate-in" style={{ textAlign: "center", padding: "36px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏏</div>
            <h3 className="t-title" style={{ marginBottom: 6 }}>No matches yet</h3>
            <p className="t-body" style={{ color: "var(--text-3)", marginBottom: 20 }}>
              Create a match or join one from your captain&apos;s link.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/create/match">
                <button className="btn btn--primary">Create Match</button>
              </Link>
              <Link href="/match/join">
                <button className="btn btn--ghost">Join Match</button>
              </Link>
            </div>
          </div>
        )}

        {/* ─── TEAMS STRIP ──────────────────────────────────────────────── */}
        {teams.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="section-row">
              <span className="section-label">My Teams</span>
              <Link href="/teams" className="section-action">Manage</Link>
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
              {teams.map(t => (
                <Link key={t.id} href={`/team/${t.id}`}
                  style={{ flexShrink: 0, padding: "8px 14px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-full)", fontSize: 13, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 6, boxShadow: "var(--shadow-1)" }}>
                  🏟️ {t.name}
                </Link>
              ))}
              <Link href="/teams"
                style={{ flexShrink: 0, padding: "8px 14px", background: "transparent", border: "1px dashed var(--line)", borderRadius: "var(--r-full)", fontSize: 13, fontWeight: 600, color: "var(--text-4)", display: "flex", alignItems: "center" }}>
                + New team
              </Link>
            </div>
          </div>
        )}

        {/* ─── NEW USER ONBOARDING ──────────────────────────────────────── */}
        {teams.length === 0 && upcoming.length === 0 && (
          <div className="card card-pad animate-in">
            <p className="t-label" style={{ marginBottom: 12 }}>Get started</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { href: "/teams",        icon: "🏟️", title: "Create a team",       sub: "Add your squad" },
                { href: "/match/join",   icon: "🔗", title: "Join a match",        sub: "Open your captain's link" },
                { href: "/availability", icon: "📋", title: "Check availability",  sub: "Respond to your captain" },
              ].map(({ href, icon, title, sub }) => (
                <Link key={href} href={href}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--surface-2)", borderRadius: "var(--r-md)", cursor: "pointer" }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{title}</p>
                      <p className="t-caption" style={{ marginTop: 2 }}>{sub}</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

// ─── Match cards ──────────────────────────────────────────────────────────────

function CaptainMatchCard({ match }: { match: MatchSummary }) {
  const confirmed = match.confirmedCount ?? 0;
  const total     = match.squadSize ?? 0;
  const pending   = match.pendingCount ?? 0;
  const left      = Math.max(0, total - confirmed);
  const pct       = total > 0 ? Math.min((confirmed / total) * 100, 100) : 0;

  const accentCls = match.status === "LOCKED" || match.status === "READY"
    ? "match-card__accent--locked"
    : pending > 0 ? "match-card__accent--amber"
    : "match-card__accent";

  return (
    <Link href={`/match/control?matchId=${match.id}`} className="match-card animate-in">
      <div className={`match-card__accent ${accentCls}`} />
      <div className="match-card__body">
        <div className="match-card__header">
          <div style={{ minWidth: 0 }}>
            <p className="match-card__title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {match.title}
            </p>
            <div className="match-card__meta">
              <span>📅 {fmt(match.startsAt)}</span>
              {match.venueName && <span>📍 {match.venueName}</span>}
            </div>
          </div>
          <span className="badge badge-blue" style={{ flexShrink: 0 }}>Captain</span>
        </div>

        {/* Stats strip */}
        <div className="stats-strip">
          <div className="stats-strip__item">
            <span className="stats-strip__num" style={{ color: "var(--green)" }}>{confirmed}</span>
            <span className="stats-strip__label">Confirmed</span>
          </div>
          <div className="stats-strip__item">
            <span className="stats-strip__num" style={{ color: pending > 0 ? "var(--amber)" : "var(--text-4)" }}>{pending}</span>
            <span className="stats-strip__label">Pending</span>
          </div>
          <div className="stats-strip__item">
            <span className="stats-strip__num" style={{ color: left > 0 ? "var(--blue)" : "var(--green)" }}>{left}</span>
            <span className="stats-strip__label">Slots left</span>
          </div>
        </div>

        <div className="progress">
          <div className="progress__fill" style={{ width: `${pct}%` }} />
        </div>

        <p style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: "var(--blue)", margin: 0 }}>
          Open Control Panel →
        </p>
      </div>
    </Link>
  );
}

function PlayerMatchCard({ match }: { match: MatchSummary }) {
  const confirmed = match.confirmedCount ?? 0;
  const total     = match.squadSize ?? 0;
  const isLocked  = match.status === "LOCKED" || match.status === "READY";

  return (
    <Link href={`/match/${match.id}`} className="match-card animate-in">
      <div className={`match-card__accent ${isLocked ? "match-card__accent--locked" : "match-card__accent--amber"}`} />
      <div className="match-card__body">
        <div className="match-card__header">
          <div style={{ minWidth: 0 }}>
            <p className="match-card__title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {match.title}
            </p>
            <div className="match-card__meta">
              <span>📅 {fmt(match.startsAt)}</span>
              {match.venueName && <span>📍 {match.venueName}</span>}
            </div>
          </div>
          <span className={`badge ${isLocked ? "badge-green" : "badge-amber"}`} style={{ flexShrink: 0 }}>
            {isLocked ? "Locked ✅" : "Filling"}
          </span>
        </div>

        <div className="mini-stats">
          <span className="mini-stat" style={{ color: "var(--green)" }}>👥 {confirmed}/{total}</span>
          {match.pricePerPlayer > 0 && (
            <span className="mini-stat" style={{ color: "var(--text-3)" }}>₹{match.pricePerPlayer}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
