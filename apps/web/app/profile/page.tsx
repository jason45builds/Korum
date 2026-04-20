"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import Link from "next/link";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { useAuth } from "@/hooks/useAuth";
import { getMyTeams } from "@/services/api/team";
import type { TeamDetails } from "@korum/types/team";

export default function ProfilePage() {
  const { profile, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const [teams, setTeams]   = useState<TeamDetails[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    getMyTeams().then(r => setTeams(r.teams)).catch(() => {}).finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (!authLoading && !isAuthenticated) {
    return (
      <main>
        <div className="page">
          <div style={{ textAlign: "center", padding: "48px 0 24px" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--surface-2)", border: "2px solid var(--line)", display: "grid", placeItems: "center", margin: "0 auto 16px", fontSize: 32 }}>
              👤
            </div>
            <h2 className="t-h2" style={{ marginBottom: 8 }}>Your Profile</h2>
            <p className="t-body" style={{ color: "var(--text-3)", marginBottom: 24 }}>
              Sign in to view your teams, matches, and stats.
            </p>
          </div>
          <AuthPanel />
        </div>
      </main>
    );
  }

  if (authLoading || loading) return <main><Loader label="Loading profile…" /></main>;

  const initials = (name?: string | null) =>
    (name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <main>
      <div className="page">

        {/* ── Avatar + name ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0 8px", textAlign: "center" }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "var(--blue-soft)", border: "3px solid var(--blue-border)",
            display: "grid", placeItems: "center",
            fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 28,
            color: "var(--blue)", marginBottom: 14,
          }}>
            {initials(profile?.displayName)}
          </div>
          <h1 className="t-h2">{profile?.displayName ?? "Player"}</h1>
          {profile?.phone && (
            <p className="t-caption" style={{ marginTop: 4 }}>{profile.phone}</p>
          )}
        </div>

        {/* ── Stats strip ── */}
        <div className="stats-strip">
          <div className="stats-strip__item">
            <span className="stats-strip__num">{teams.length}</span>
            <span className="stats-strip__label">Teams</span>
          </div>
          <div className="stats-strip__item">
            <span className="stats-strip__num">–</span>
            <span className="stats-strip__label">Matches</span>
          </div>
          <div className="stats-strip__item">
            <span className="stats-strip__num">–</span>
            <span className="stats-strip__label">Reliability</span>
          </div>
        </div>

        {/* ── My Teams ── */}
        {teams.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="section-row">
              <span className="section-label">My Teams</span>
              <Link href="/teams" className="section-action">Manage</Link>
            </div>
            {teams.map(t => (
              <Link key={t.id} href={`/team/${t.id}`}>
                <div className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "var(--blue-soft)", display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0 }}>
                    🏟️
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14 }}>{t.name}</p>
                    <p className="t-caption" style={{ marginTop: 2 }}>{t.sport} · {t.city} · {t.members.length} members</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="card" style={{ overflow: "hidden" }}>
          {[
            { href: "/create/match", icon: "🏏", label: "Create a Match" },
            { href: "/match/join",   icon: "🔗", label: "Join a Match" },
            { href: "/availability", icon: "📋", label: "My Availability" },
          ].map(({ href, icon, label }, i, arr) => (
            <Link key={href} href={href}>
              <div style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px",
                borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none",
                cursor: "pointer",
              }}>
                <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{icon}</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, flex: 1 }}>{label}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Settings ── */}
        <div className="card" style={{ overflow: "hidden" }}>
          <button
            onClick={() => void signOut()}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 14,
              padding: "14px 16px", background: "none", border: "none",
              cursor: "pointer", textAlign: "left",
            }}>
            <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>🚪</span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--red)", flex: 1 }}>Sign Out</span>
          </button>
        </div>

        <p className="t-caption" style={{ textAlign: "center", color: "var(--text-4)" }}>
          Korum · Match Readiness Platform
        </p>

      </div>
    </main>
  );
}
