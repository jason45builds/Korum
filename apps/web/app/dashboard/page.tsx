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

type PendingAvailability = {
  id: string;
  check_id: string;
  availability_checks: {
    id: string; match_date: string; match_time: string | null;
    venue_hint: string | null; note: string | null; expires_at: string;
  };
};

export default function HomePage() {
  const { profile, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { dashboardMatches, pendingPayments, loading: matchLoading, loadDashboard } = useMatch();
  const [teams, setTeams]     = useState<TeamDetails[]>([]);
  const [pendingAv, setPendingAv] = useState<PendingAvailability[]>([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isAuthenticated) return;
    void loadDashboard();
    void getMyTeams().then((r) => setTeams(r.teams)).catch(() => {});
    void fetch("/api/availability-check", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d: { pending?: PendingAvailability[] }) => setPendingAv(d.pending ?? []))
      .catch(() => {});
  }, [isAuthenticated]);

  // ── Not signed in ─────────────────────────────────────────────────────────
  if (!authLoading && !isAuthenticated) {
    return (
      <main>
        <div className="page-shell">
          {/* Hero */}
          <section className="hero-panel animate-in">
            <p className="eyebrow">Match Readiness Platform</p>
            <h1 className="title-xl" style={{ marginTop: "0.4rem", marginBottom: "0.6rem" }}>
              Build the squad before kickoff.
            </h1>
            <p className="muted" style={{ fontSize: "0.95rem", maxWidth: "36rem" }}>
              Captains send a link. Players tap YES and pay. Everyone knows who&apos;s in.
            </p>
            <div className="cluster" style={{ marginTop: "1.25rem" }}>
              <Link href="/match/join"><Button size="lg">Join a Match</Button></Link>
              <Link href="/create/match"><Button variant="secondary" size="lg">Create Match</Button></Link>
            </div>
          </section>

          {/* 3-step strip */}
          <div className="grid grid-3">
            {[
              { icon: "📣", step: "01", title: "Captain shares link", body: "One WhatsApp message, link opens on any phone" },
              { icon: "💰", step: "02", title: "Player pays to confirm", body: "Tap YES → pay → captain confirms spot" },
              { icon: "🔒", step: "03", title: "Squad locks automatically", body: "Once full, everyone knows the match is on" },
            ].map(({ icon, step, title, body }) => (
              <div key={step} className="panel animate-in" style={{ display: "grid", gap: "0.5rem" }}>
                <div style={{ fontSize: "1.6rem" }}>{icon}</div>
                <p className="eyebrow" style={{ color: "var(--text-faint)" }}>{step}</p>
                <strong style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem" }}>{title}</strong>
                <p className="muted" style={{ fontSize: "0.82rem" }}>{body}</p>
              </div>
            ))}
          </div>

          <AuthPanel />
        </div>
      </main>
    );
  }

  if (authLoading) return <main><Loader label="Loading…" /></main>;

  // ── Signed in — action-oriented home feed ─────────────────────────────────
  const upcomingMatches = dashboardMatches.filter((m) =>
    ["RSVP_OPEN", "PAYMENT_PENDING", "LOCKED", "READY"].includes(m.status)
  );
  const myConfirmedMatches = upcomingMatches.filter((m) => m.captainId !== profile?.id);
  const captainMatches = upcomingMatches.filter((m) => m.captainId === profile?.id);

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <main>
      <div className="page-shell">

        {/* ── Greeting ── */}
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p className="muted" style={{ fontSize: "0.85rem" }}>{greet()}</p>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "var(--text)" }}>
              {profile?.displayName ?? "Captain"}
            </h1>
          </div>
          <button onClick={() => void signOut()}
            style={{ all: "unset", cursor: "pointer", fontSize: "0.8rem", color: "var(--text-faint)", padding: "0.4rem 0.75rem", border: "1px solid var(--line)", borderRadius: "999px" }}>
            Sign out
          </button>
        </section>

        {/* ── SECTION 1: Pending actions (highest urgency) ── */}
        {(pendingPayments.length > 0 || pendingAv.length > 0) && (
          <section style={{ display: "grid", gap: "0.6rem" }}>
            <p className="eyebrow" style={{ color: "var(--warning)" }}>⚠️ Action needed</p>

            {pendingPayments.slice(0, 3).map((p) => (
              <ActionCard key={p.id} icon="💰" title="Pay to confirm your spot"
                subtitle={`Match · ₹${p.amount}`}
                cta="Pay Now" href={`/match/${p.matchId}`} color="warning" />
            ))}

            {pendingAv.slice(0, 3).map((item) => {
              const chk = item.availability_checks;
              return (
                <ActionCard key={item.id} icon="📋" title="Are you available?"
                  subtitle={`${fmtDate(chk.match_date)}${chk.match_time ? ` · ${chk.match_time}` : ""}${chk.venue_hint ? ` · ${chk.venue_hint}` : ""}`}
                  cta="Respond" href="/availability" color="primary" />
              );
            })}
          </section>
        )}

        {/* ── SECTION 2: Captain — needs review ── */}
        {captainMatches.length > 0 && (
          <section style={{ display: "grid", gap: "0.6rem" }}>
            <div className="row-between">
              <p className="eyebrow">Captain</p>
              <Link href="/matches" style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600 }}>See all →</Link>
            </div>
            {captainMatches.slice(0, 2).map((m) => (
              <CaptainMatchCard key={m.id} match={m} />
            ))}
          </section>
        )}

        {/* ── SECTION 3: My confirmed matches ── */}
        {myConfirmedMatches.length > 0 && (
          <section style={{ display: "grid", gap: "0.6rem" }}>
            <p className="eyebrow" style={{ color: "var(--success)" }}>✅ Your confirmed matches</p>
            {myConfirmedMatches.map((m) => (
              <PlayerMatchCard key={m.id} match={m} />
            ))}
          </section>
        )}

        {/* ── SECTION 4: All upcoming if nothing else ── */}
        {captainMatches.length === 0 && myConfirmedMatches.length === 0 && pendingPayments.length === 0 && (
          <>
            {matchLoading ? (
              <div className="panel" style={{ textAlign: "center", padding: "2rem" }}>
                <Loader label="Loading matches…" />
              </div>
            ) : upcomingMatches.length > 0 ? (
              <section style={{ display: "grid", gap: "0.6rem" }}>
                <p className="eyebrow">Upcoming</p>
                {upcomingMatches.slice(0, 3).map((m) => (
                  <PlayerMatchCard key={m.id} match={m} />
                ))}
              </section>
            ) : (
              <div className="panel animate-in" style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🏟️</div>
                <h3 className="title-md">No matches yet</h3>
                <p className="muted" style={{ fontSize: "0.88rem", marginTop: "0.4rem" }}>
                  Create one or join a squad using a link from your captain.
                </p>
                <div className="cluster" style={{ justifyContent: "center", marginTop: "1.25rem" }}>
                  <Link href="/create/match"><Button>Create Match</Button></Link>
                  <Link href="/match/join"><Button variant="secondary">Join Match</Button></Link>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── SECTION 5: My teams (compact) ── */}
        {teams.length > 0 && (
          <section style={{ display: "grid", gap: "0.6rem" }}>
            <div className="row-between">
              <p className="eyebrow">My Teams</p>
              <Link href="/teams" style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600 }}>Manage →</Link>
            </div>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              {teams.slice(0, 4).map((t) => (
                <Link key={t.id} href={`/team/${t.id}`}
                  style={{ padding: "0.5rem 0.9rem", background: "var(--surface)", border: "1.5px solid var(--line)", borderRadius: "999px", fontSize: "0.88rem", fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  🏟️ {t.name}
                </Link>
              ))}
              <Link href="/teams"
                style={{ padding: "0.5rem 0.9rem", background: "var(--surface-muted)", border: "1.5px dashed var(--line)", borderRadius: "999px", fontSize: "0.88rem", fontWeight: 600, color: "var(--text-faint)" }}>
                + Add team
              </Link>
            </div>
          </section>
        )}

        {/* ── Empty state for new users ── */}
        {teams.length === 0 && upcomingMatches.length === 0 && (
          <div className="panel animate-in" style={{ display: "grid", gap: "1rem", padding: "1.25rem" }}>
            <p className="eyebrow">Get started</p>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <Link href="/teams"><ActionBanner icon="🏟️" title="Create a team" sub="Invite your squad members" /></Link>
              <Link href="/match/join"><ActionBanner icon="🔗" title="Join a match" sub="Open a link from your captain" /></Link>
              <Link href="/availability"><ActionBanner icon="📋" title="Check availability requests" sub="See if your captain needs you" /></Link>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ActionCard({ icon, title, subtitle, cta, href, color }: {
  icon: string; title: string; subtitle: string; cta: string; href: string;
  color: "warning" | "primary" | "danger";
}) {
  const colors = {
    warning: { bg: "var(--warning-soft)", border: "#fde68a", text: "var(--warning)" },
    primary: { bg: "var(--primary-soft)", border: "#a7f3c0",  text: "var(--primary)" },
    danger:  { bg: "var(--danger-soft)",  border: "#fca5a5",  text: "var(--danger)"  },
  };
  const c = colors[color];
  return (
    <div style={{ background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: "var(--radius-md)", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
        <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{icon}</span>
        <div>
          <strong style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", display: "block" }}>{title}</strong>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{subtitle}</span>
        </div>
      </div>
      <Link href={href}>
        <Button size="sm" style={{ flexShrink: 0, background: c.text, borderColor: c.text }}>{cta}</Button>
      </Link>
    </div>
  );
}

function CaptainMatchCard({ match }: { match: MatchSummary }) {
  const confirmed = match.confirmedCount ?? 0;
  const total     = match.squadSize ?? 0;
  const pending   = match.pendingCount ?? 0;
  const left      = Math.max(0, total - confirmed);
  return (
    <Link href={`/match/control?matchId=${match.id}`} style={{ display: "block" }}>
      <div className="panel" style={{ display: "grid", gap: "0.75rem", cursor: "pointer" }}>
        <div className="row-between">
          <div>
            <strong style={{ fontFamily: "var(--font-display)", fontSize: "1rem" }}>{match.title}</strong>
            <div className="faint" style={{ fontSize: "0.8rem", marginTop: "0.1rem" }}>
              {fmtDate(match.startsAt)} · {match.venueName}
            </div>
          </div>
          <span className="badge badge-warning">Captain</span>
        </div>
        {/* Status bar */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--success)", fontWeight: 700 }}>✅ {confirmed} confirmed</span>
          {pending > 0 && <span style={{ fontSize: "0.82rem", color: "var(--warning)", fontWeight: 700 }}>⏳ {pending} pending</span>}
          <span style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>{left} slots left</span>
        </div>
        {/* Mini progress */}
        <div className="progress-bar">
          <div className="progress-bar__fill" style={{ width: total > 0 ? `${Math.min((confirmed / total) * 100, 100)}%` : "0%" }} />
        </div>
        <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600, fontFamily: "var(--font-display)" }}>
          Open control panel →
        </span>
      </div>
    </Link>
  );
}

function PlayerMatchCard({ match }: { match: MatchSummary }) {
  const confirmed = match.confirmedCount ?? 0;
  const total     = match.squadSize ?? 0;
  return (
    <Link href={`/match/${match.id}`} style={{ display: "block" }}>
      <div className="panel" style={{ display: "grid", gap: "0.6rem", cursor: "pointer" }}>
        <div className="row-between">
          <div>
            <strong style={{ fontFamily: "var(--font-display)", fontSize: "1rem" }}>{match.title}</strong>
            <div className="faint" style={{ fontSize: "0.8rem", marginTop: "0.1rem" }}>
              {fmtDate(match.startsAt)} · {match.venueName}
            </div>
          </div>
          <StatusBadge status={match.status} />
        </div>
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.82rem" }}>
          <span style={{ color: "var(--success)", fontWeight: 700 }}>👥 {confirmed}/{total}</span>
          {match.pricePerPlayer > 0 && <span style={{ color: "var(--text-muted)" }}>₹{match.pricePerPlayer}</span>}
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const cls = s === "LOCKED" || s === "READY" ? "badge-success"
            : s === "RSVP_OPEN" || s === "PAYMENT_PENDING" ? "badge-warning"
            : "";
  return <span className={`badge ${cls}`}>{status.replace(/_/g, " ")}</span>;
}

function ActionBanner({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "var(--surface-muted)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
      <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{icon}</span>
      <div>
        <strong style={{ fontFamily: "var(--font-display)", fontSize: "0.9rem", display: "block" }}>{title}</strong>
        <span className="faint" style={{ fontSize: "0.78rem" }}>{sub}</span>
      </div>
      <svg style={{ marginLeft: "auto", flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
    </div>
  );
}

function fmtDate(s: string) {
  if (!s) return "";
  try { return new Date(s).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return s; }
}
