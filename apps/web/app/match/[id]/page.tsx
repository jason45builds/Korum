"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import Link from "next/link";
import { useParams } from "next/navigation";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";

function fmt(s: string) {
  try { return new Date(s).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return s; }
}
function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function MatchPage() {
  const params = useParams<{ id: string }>();
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { activeMatch, loading } = useMatch(params.id);

  if (loading && !activeMatch) return <main><Loader label="Loading match…" /></main>;

  if (!activeMatch) {
    return (
      <main>
        <div className="page-shell" style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔍</div>
          <h2 className="title-md">Match not found</h2>
          <p className="muted" style={{ marginTop: "0.4rem", fontSize: "0.9rem" }}>Check the link or join code and try again.</p>
          <div style={{ marginTop: "1.25rem" }}>
            <Link href="/match/join"><Button>Join via code</Button></Link>
          </div>
        </div>
      </main>
    );
  }

  if (authLoading) return <main><Loader label="Checking your session…" /></main>;

  const confirmed = activeMatch.participants.filter(p => ["CONFIRMED","LOCKED"].includes(p.status)).length;
  const pending   = activeMatch.participants.filter(p => p.status === "PAYMENT_PENDING").length;
  const slotsLeft = Math.max(0, activeMatch.squadSize - confirmed);
  const me        = isAuthenticated ? activeMatch.participants.find(p => p.userId === profile?.id) : null;
  const isConfirmed = me && ["CONFIRMED","LOCKED"].includes(me.status);
  const isPending   = me?.status === "PAYMENT_PENDING";
  const isCaptain   = isAuthenticated && activeMatch.captainId === profile?.id;

  const statusLabel = activeMatch.status === "LOCKED" || activeMatch.status === "READY"
    ? { text: "Squad locked ✅", cls: "badge-success" }
    : activeMatch.status === "PAYMENT_PENDING" || activeMatch.status === "RSVP_OPEN"
    ? { text: "Filling squad", cls: "badge-warning" }
    : { text: activeMatch.status.replace(/_/g, " "), cls: "" };

  return (
    <main>
      <div className="page-shell">

        {/* ── Match card ── */}
        <section className="hero-panel animate-in">
          <div className="row-between" style={{ marginBottom: "0.75rem" }}>
            <span className={`badge ${statusLabel.cls}`}>{statusLabel.text}</span>
            {isCaptain && (
              <Link href={`/match/control?matchId=${activeMatch.id}`}>
                <Button size="sm" variant="secondary">Captain Panel</Button>
              </Link>
            )}
          </div>

          <h1 className="title-lg">{activeMatch.title}</h1>
          <p className="muted" style={{ marginTop: "0.3rem", fontSize: "0.9rem" }}>
            📅 {fmt(activeMatch.startsAt)}
          </p>
          {activeMatch.venueName && (
            <p className="muted" style={{ fontSize: "0.9rem" }}>📍 {activeMatch.venueName}</p>
          )}
          {activeMatch.pricePerPlayer > 0 && (
            <p className="muted" style={{ fontSize: "0.9rem" }}>💰 ₹{activeMatch.pricePerPlayer} per player</p>
          )}

          {/* Status bar — the trust engine */}
          <div className="status-bar" style={{ marginTop: "1rem" }}>
            <div className="status-bar__item">
              <span className="status-bar__num" style={{ color: "var(--success)" }}>{confirmed}</span>
              <span className="status-bar__label">Confirmed</span>
            </div>
            <div className="status-bar__item">
              <span className="status-bar__num" style={{ color: "var(--warning)" }}>{pending}</span>
              <span className="status-bar__label">Pending</span>
            </div>
            <div className="status-bar__item">
              <span className="status-bar__num" style={{ color: slotsLeft > 0 ? "var(--primary)" : "var(--success)" }}>{slotsLeft}</span>
              <span className="status-bar__label">Slots left</span>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        {!isAuthenticated ? (
          <AuthPanel title="Sign in to join this match" />
        ) : isConfirmed ? (
          <div className="panel animate-in" style={{ textAlign: "center", padding: "1.25rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>✅</div>
            <strong style={{ fontFamily: "var(--font-display)", fontSize: "1rem" }}>
              You&apos;re confirmed!
            </strong>
            <p className="muted" style={{ fontSize: "0.88rem", marginTop: "0.25rem" }}>
              Your spot is locked. See you on the field.
            </p>
          </div>
        ) : isPending ? (
          <div className="panel animate-in" style={{ display: "grid", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.5rem" }}>⏳</span>
              <div>
                <strong style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", display: "block" }}>
                  Payment pending
                </strong>
                <span className="faint">Complete payment to confirm your spot</span>
              </div>
            </div>
            <Link href={`/match/payment?matchId=${activeMatch.id}`}>
              <button className="btn-action btn-action--yes" style={{ marginTop: "0.25rem" }}>
                💰 Pay ₹{activeMatch.pricePerPlayer} Now
              </button>
            </Link>
          </div>
        ) : !me ? (
          <div className="panel animate-in" style={{ display: "grid", gap: "0.75rem" }}>
            {slotsLeft > 0 ? (
              <>
                <Link href={`/match/join?matchId=${activeMatch.id}`}>
                  <button className="btn-action btn-action--yes">
                    ✅ I&apos;m In
                  </button>
                </Link>
                <Link href={`/match/join?matchId=${activeMatch.id}`}>
                  <button className="btn-action btn-action--no">
                    ❌ Can&apos;t Play
                  </button>
                </Link>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "0.5rem" }}>
                <p className="muted" style={{ fontSize: "0.9rem" }}>Squad is full. No slots available.</p>
              </div>
            )}
          </div>
        ) : null}

        {/* ── Player list ── */}
        <section className="panel animate-in">
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.75rem", color: "var(--text-muted)" }}>
            PLAYERS ({activeMatch.participants.length}/{activeMatch.squadSize})
          </p>

          {/* Confirmed */}
          {activeMatch.participants.filter(p => ["CONFIRMED","LOCKED"].includes(p.status)).length > 0 && (
            <>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--success)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                Confirmed
              </p>
              {activeMatch.participants.filter(p => ["CONFIRMED","LOCKED"].includes(p.status)).map(p => (
                <div key={p.participantId} className="player-row">
                  <div className="player-avatar">{initials(p.fullName)}</div>
                  <div style={{ flex: 1 }}>
                    <div className="player-name">{p.fullName}</div>
                  </div>
                  <span style={{ fontSize: "1rem" }}>✅</span>
                </div>
              ))}
            </>
          )}

          {/* Pending */}
          {activeMatch.participants.filter(p => p.status === "PAYMENT_PENDING").length > 0 && (
            <>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--warning)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0.75rem 0 0.25rem" }}>
                Pending payment
              </p>
              {activeMatch.participants.filter(p => p.status === "PAYMENT_PENDING").map(p => (
                <div key={p.participantId} className="player-row">
                  <div className="player-avatar" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>{initials(p.fullName)}</div>
                  <div style={{ flex: 1 }}>
                    <div className="player-name">{p.fullName}</div>
                    <div className="player-sub">Awaiting payment</div>
                  </div>
                  <span style={{ fontSize: "1rem" }}>⏳</span>
                </div>
              ))}
            </>
          )}

          {activeMatch.participants.length === 0 && (
            <p className="muted" style={{ fontSize: "0.9rem", textAlign: "center", padding: "1rem 0" }}>
              No players yet. Share the link to fill the squad.
            </p>
          )}
        </section>

        {/* ── Strategy room link (after lock) ── */}
        {(activeMatch.status === "LOCKED" || activeMatch.status === "READY") && isAuthenticated && (
          <Link href={`/match/room?matchId=${activeMatch.id}`} style={{ display: "block" }}>
            <div className="panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
              <div className="row" style={{ gap: "0.75rem" }}>
                <span style={{ fontSize: "1.4rem" }}>🧠</span>
                <div>
                  <strong style={{ fontFamily: "var(--font-display)", fontSize: "0.93rem" }}>Match Room</strong>
                  <div className="faint" style={{ fontSize: "0.8rem" }}>Strategy, lineup & coordination</div>
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
            </div>
          </Link>
        )}

      </div>
    </main>
  );
}
