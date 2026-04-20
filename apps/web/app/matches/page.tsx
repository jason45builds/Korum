"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import Link from "next/link";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";
import type { MatchSummary } from "@korum/types/match";

type Filter = "all" | "captain" | "player" | "locked";

const fmt = (s: string) => {
  if (!s) return "";
  try { return new Date(s).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return s; }
};

export default function MatchesPage() {
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { dashboardMatches, loading, loadDashboard } = useMatch();
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => { if (isAuthenticated) void loadDashboard(); }, [isAuthenticated]);

  if (!authLoading && !isAuthenticated) {
    return <main><div className="page"><AuthPanel title="Sign in to see your matches" /></div></main>;
  }
  if (authLoading || (loading && dashboardMatches.length === 0)) {
    return <main><Loader label="Loading matches…" /></main>;
  }

  const tabs: { id: Filter; label: string }[] = [
    { id: "all",     label: "All" },
    { id: "captain", label: "Captain" },
    { id: "player",  label: "Player" },
    { id: "locked",  label: "Locked" },
  ];

  const filtered = dashboardMatches.filter(m => {
    if (filter === "captain") return m.captainId === profile?.id;
    if (filter === "player")  return m.captainId !== profile?.id;
    if (filter === "locked")  return m.status === "LOCKED" || m.status === "READY";
    return true;
  });

  const captainIds = new Set(dashboardMatches.filter(m => m.captainId === profile?.id).map(m => m.id));

  return (
    <main>
      <div className="page">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 className="t-h2">Matches</h1>
          <Link href="/create/match">
            <button className="btn btn--primary btn--sm">+ New</button>
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="tab-bar">
          {tabs.map(t => (
            <button key={t.id} className={`tab ${filter === t.id ? "tab--active" : ""}`}
              onClick={() => setFilter(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Match list */}
        {filtered.length === 0 ? (
          <div className="card card-pad animate-in" style={{ textAlign: "center", padding: "36px 20px" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏏</div>
            <h3 className="t-title" style={{ marginBottom: 8 }}>No matches here</h3>
            <p className="t-body" style={{ color: "var(--text-3)" }}>
              {filter === "captain" ? "Create a match to get started." : "Join a match from your captain's link."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(m => (
              <MatchListCard key={m.id} match={m} isCaptain={captainIds.has(m.id)} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function MatchListCard({ match, isCaptain }: { match: MatchSummary; isCaptain: boolean }) {
  const confirmed = match.confirmedCount ?? 0;
  const total     = match.squadSize ?? 0;
  const pending   = match.pendingCount ?? 0;
  const pct       = total > 0 ? Math.min((confirmed / total) * 100, 100) : 0;
  const isLocked  = match.status === "LOCKED" || match.status === "READY";

  const accentCls = isLocked ? "match-card__accent--locked"
    : isCaptain && pending > 0 ? "match-card__accent--amber"
    : "match-card__accent";

  const href = isCaptain ? `/match/control?matchId=${match.id}` : `/match/${match.id}`;

  return (
    <Link href={href} className="match-card animate-in">
      <div className={`match-card__accent ${accentCls}`} />
      <div className="match-card__body">
        <div className="match-card__header">
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="match-card__title">{match.title}</p>
            <div className="match-card__meta">
              <span>📅 {fmt(match.startsAt)}</span>
              {match.venueName && <span>📍 {match.venueName}</span>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
            {isCaptain && <span className="badge badge-blue">Captain</span>}
            <span className={`badge ${isLocked ? "badge-green" : match.status === "PAYMENT_PENDING" ? "badge-amber" : ""}`}>
              {isLocked ? "Locked" : match.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>

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
            <span className="stats-strip__num" style={{ color: "var(--text-2)" }}>
              {match.pricePerPlayer > 0 ? `₹${match.pricePerPlayer}` : "Free"}
            </span>
            <span className="stats-strip__label">Per player</span>
          </div>
        </div>

        <div className="progress">
          <div className="progress__fill progress__fill--green" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  );
}
