"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";

const fmt = (s: string) => {
  if (!s) return "";
  try { return new Date(s).toLocaleString("en-IN", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }); }
  catch { return s; }
};
const ini = (name: string) =>
  name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

export default function MatchPage() {
  const { id }    = useParams<{ id: string }>();
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { activeMatch, loading } = useMatch(id);

  // ── ALL hooks before any early return ──────────────────────────────────────
  const [droppingOut, setDroppingOut] = useState(false);
  const [droppedOut,  setDroppedOut]  = useState(false);

  // ── Early returns AFTER all hooks ──────────────────────────────────────────
  if (loading && !activeMatch) return <main><Loader label="Loading match…" /></main>;

  if (!activeMatch) {
    return (
      <main>
        <div className="page" style={{ textAlign: "center", paddingTop: 48 }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🔍</div>
          <h2 className="t-h2" style={{ marginBottom: 8 }}>Match not found</h2>
          <p className="t-body" style={{ color: "var(--text-3)" }}>
            This link may have expired or the match was removed.
          </p>
          <div style={{ marginTop: 24 }}>
            <Link href="/match/join">
              <button className="btn btn--primary">Join via code</button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (authLoading) return <main><Loader label="Checking session…" /></main>;

  // ── Derived state ──────────────────────────────────────────────────────────
  const confirmed = activeMatch.participants.filter(p => ["CONFIRMED","LOCKED"].includes(p.status));
  const pending   = activeMatch.participants.filter(p => p.status === "PAYMENT_PENDING");
  const slotsLeft = Math.max(0, activeMatch.squadSize - confirmed.length);
  const isLocked  = activeMatch.status === "LOCKED" || activeMatch.status === "READY";
  const isCaptain = isAuthenticated && activeMatch.captainId === profile?.id;
  const me        = isAuthenticated ? activeMatch.participants.find(p => p.userId === profile?.id) : null;
  const meConfirmed = me && ["CONFIRMED","LOCKED"].includes(me.status);
  const mePending   = me?.status === "PAYMENT_PENDING";
  const pct = activeMatch.squadSize > 0
    ? Math.min((confirmed.length / activeMatch.squadSize) * 100, 100) : 0;
  const accentColor = isLocked ? "var(--green)" : pending.length > 0 ? "var(--amber)" : "var(--blue)";

  const handleDropOut = async () => {
    if (!confirm("Are you sure? Dropping out after confirming will affect your reliability score.")) return;
    setDroppingOut(true);
    try {
      await fetch("/api/participants/drop-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ matchId: id }),
      });
      setDroppedOut(true);
    } finally { setDroppingOut(false); }
  };

  return (
    <main>
      <div className="page">

        {/* ── Match header card ── */}
        <div className="card animate-in" style={{ overflow: "hidden" }}>
          <div style={{ height: 4, background: accentColor }} />
          <div className="card-pad">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <div style={{ minWidth: 0 }}>
                <h1 className="t-h2" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeMatch.title}
                </h1>
                <p className="t-caption" style={{ marginTop: 4 }}>📅 {fmt(activeMatch.startsAt)}</p>
                {activeMatch.venueName && (
                  <p className="t-caption" style={{ marginTop: 2 }}>📍 {activeMatch.venueName}</p>
                )}
                {activeMatch.pricePerPlayer > 0 && (
                  <p className="t-caption" style={{ marginTop: 2 }}>💰 ₹{activeMatch.pricePerPlayer} per player</p>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                {isCaptain && <span className="badge badge-blue">Captain</span>}
                <span className={`badge ${isLocked ? "badge-green" : pending.length > 0 ? "badge-amber" : ""}`}>
                  {isLocked ? "Locked ✅" : activeMatch.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Stats strip */}
            <div className="stats-strip">
              <div className="stats-strip__item">
                <span className="stats-strip__num" style={{ color: "var(--green)" }}>{confirmed.length}</span>
                <span className="stats-strip__label">Confirmed</span>
              </div>
              <div className="stats-strip__item">
                <span className="stats-strip__num" style={{ color: pending.length > 0 ? "var(--amber)" : "var(--text-4)" }}>{pending.length}</span>
                <span className="stats-strip__label">Pending pay</span>
              </div>
              <div className="stats-strip__item">
                <span className="stats-strip__num" style={{ color: slotsLeft > 0 ? "var(--blue)" : "var(--green)" }}>{slotsLeft}</span>
                <span className="stats-strip__label">Slots left</span>
              </div>
            </div>

            <div className="progress" style={{ marginTop: 12 }}>
              <div className="progress__fill" style={{ width: `${pct}%`, background: isLocked ? "var(--green)" : "var(--blue)" }} />
            </div>
          </div>
        </div>

        {/* ── CTA block ── */}
        {!isAuthenticated ? (
          <div className="card card-pad animate-in">
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Join this match</p>
            <p className="t-caption" style={{ marginBottom: 16 }}>Sign in to confirm your spot and pay.</p>
            <AuthPanel />
          </div>

        ) : meConfirmed && !droppedOut ? (
          <div className="card card-pad animate-in" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--green)" }}>You&apos;re confirmed!</p>
              <p className="t-caption" style={{ marginTop: 4 }}>Your spot is locked. See you on the field.</p>
            </div>
            {!isLocked && (
              <button
                onClick={() => void handleDropOut()}
                disabled={droppingOut}
                style={{ padding: 8, border: "none", background: "transparent", color: "var(--red)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12, cursor: "pointer", opacity: droppingOut ? 0.5 : 1 }}>
                {droppingOut ? "Cancelling…" : "Can no longer play? Drop out"}
              </button>
            )}
          </div>

        ) : meConfirmed && droppedOut ? (
          <div className="card card-pad animate-in" style={{ textAlign: "center", background: "var(--red-soft)", borderColor: "var(--red-border)" }}>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--red)" }}>You&apos;ve dropped out</p>
            <p className="t-caption" style={{ marginTop: 4 }}>Captain has been notified. Your reliability score has been updated.</p>
          </div>

        ) : mePending ? (
          <div className="card card-pad animate-in">
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 24 }}>⏳</span>
              <div>
                <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>Payment pending</p>
                <p className="t-caption" style={{ marginTop: 2 }}>Complete payment to confirm your spot</p>
              </div>
            </div>
            <Link href={`/match/payment?matchId=${activeMatch.id}`}>
              <button className="btn-yes">💰 Pay ₹{activeMatch.pricePerPlayer} Now</button>
            </Link>
          </div>

        ) : !me && slotsLeft > 0 ? (
          <div className="card card-pad animate-in" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link href={`/match/join?matchId=${activeMatch.id}`}>
              <button className="btn-yes">✅ I&apos;m In</button>
            </Link>
            <button
              className="btn-no"
              onClick={() => {
                // Player declines — no join, no action needed, just visual feedback
                window.history.back();
              }}>
              ❌ Can&apos;t Play
            </button>
          </div>

        ) : !me && slotsLeft === 0 ? (
          <div className="card card-pad animate-in" style={{ textAlign: "center" }}>
            <p className="t-body" style={{ color: "var(--text-3)" }}>Squad is full. No slots left.</p>
          </div>
        ) : null}

        {/* ── Captain quick actions ── */}
        {isCaptain && (
          <div style={{ display: "flex", gap: 10 }}>
            <Link href={`/match/control?matchId=${activeMatch.id}`} style={{ flex: 1 }}>
              <button className="btn btn--primary btn--block">Control Panel</button>
            </Link>
            <Link href={`/match/room?matchId=${activeMatch.id}`} style={{ flex: 1 }}>
              <button className="btn btn--secondary btn--block">🧠 Strategy Room</button>
            </Link>
          </div>
        )}

        {/* WhatsApp invite button — for non-captains and always visible when match has a slot */}
        {isAuthenticated && !isCaptain && slotsLeft > 0 && (
          <button
            onClick={() => {
              const text = `🏐 ${activeMatch.title} — ${slotsLeft} slot${slotsLeft > 1 ? "s" : ""} left!\n📅 ${new Date(activeMatch.startsAt).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}${activeMatch.venueName ? `\n📍 ${activeMatch.venueName}` : ""}\n\nJoin the match 👉 ${window.location.href}`;
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
            }}
            style={{ width: "100%", minHeight: 46, border: "none", borderRadius: "var(--r-lg)", background: "#25D366", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            Invite friends to this match
          </button>
        )}

        {/* ── Strategy room for all confirmed players after lock ── */}
        {isLocked && isAuthenticated && !isCaptain && (
          <Link href={`/match/room?matchId=${activeMatch.id}`}>
            <div className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>🧠</span>
                <div>
                  <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>Strategy Room</p>
                  <p className="t-caption" style={{ marginTop: 2 }}>Lineup, tactics & coordination</p>
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </Link>
        )}

        {/* ── Player list ── */}
        <div className="card animate-in" style={{ overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Squad ({activeMatch.participants.length}/{activeMatch.squadSize})
            </p>
            {slotsLeft > 0 && (
              <span className="badge badge-blue">{slotsLeft} slot{slotsLeft > 1 ? "s" : ""} open</span>
            )}
          </div>

          {confirmed.length > 0 && (
            <div style={{ padding: "8px 16px 0" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--green)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "8px 0 4px" }}>Confirmed</p>
              {confirmed.map((p, i) => (
                <div key={p.participantId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < confirmed.length - 1 || pending.length > 0 ? "1px solid var(--line)" : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--green-soft)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 12, color: "var(--green)", flexShrink: 0, border: "1.5px solid var(--green-border)" }}>
                    {ini(p.fullName)}
                  </div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, flex: 1 }}>{p.fullName}</p>
                  <span style={{ fontSize: 16 }}>✅</span>
                </div>
              ))}
            </div>
          )}

          {pending.length > 0 && (
            <div style={{ padding: "0 16px 8px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--amber)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "12px 0 4px" }}>Pending payment</p>
              {pending.map((p, i) => (
                <div key={p.participantId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < pending.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--amber-soft)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 12, color: "var(--amber)", flexShrink: 0 }}>
                    {ini(p.fullName)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{p.fullName}</p>
                    <p className="t-caption" style={{ marginTop: 2 }}>Awaiting payment</p>
                  </div>
                  <span style={{ fontSize: 16 }}>⏳</span>
                </div>
              ))}
            </div>
          )}

          {activeMatch.participants.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center" }}>
              <p className="t-body" style={{ color: "var(--text-3)" }}>No players yet. Share the match link to fill the squad.</p>
            </div>
          )}

          {slotsLeft > 0 && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line)" }}>
              {Array.from({ length: Math.min(slotsLeft, 4) }).map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", border: "1.5px dashed var(--line)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2" strokeLinecap="round">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 110 8 4 4 0 010-8z" />
                    </svg>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-4)", fontStyle: "italic" }}>Open slot</p>
                </div>
              ))}
              {slotsLeft > 4 && (
                <p className="t-caption" style={{ marginTop: 4 }}>+ {slotsLeft - 4} more open slots</p>
              )}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
