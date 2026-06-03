"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Confetti, haptic } from "@/components/shared/Animations";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";
import { copyToClipboard } from "@/lib/helpers";
import { track } from "@/lib/analytics";

type AnonResponse = {
  id: string; player_name: string; player_phone: string | null;
  response: string; payment_claimed: boolean;
  captain_confirmed: boolean | null; rejection_note: string | null; created_at: string;
};
type PollData = {
  link: { id: string; token: string };
  responses: AnonResponse[];
  summary: { yes: number; no: number; maybe: number; total: number };
};
type ActionState = Record<string, "confirming" | "rejecting" | null>;

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft", RSVP_OPEN: "Open for RSVPs", PAYMENT_PENDING: "Awaiting payments",
  LOCKED: "Squad locked ✅", READY: "Ready ✅", CANCELLED: "Cancelled",
};
const STATUS_BADGE: Record<string, string> = {
  RSVP_OPEN: "badge-blue", PAYMENT_PENDING: "badge-amber",
  LOCKED: "badge-green", READY: "badge-green", CANCELLED: "badge-red",
};

function ControlPanelContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("matchId");
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { activeMatch, loading: matchLoading, loadMatch, lockMatch, updateMatch } = useMatch(matchId);

  const [pollData,     setPollData]     = useState<PollData | null>(null);
  const [pollLink,     setPollLink]     = useState<string | null>(null);
  const [creating,     setCreating]     = useState(false);
  const [copied,       setCopied]       = useState<string | null>(null);
  const [msg,          setMsg]          = useState<{ text: string; error: boolean } | null>(null);
  const [tab,          setTab]          = useState<"overview" | "players" | "share">("overview");
  const [actionState,  setActionState]  = useState<ActionState>({});
  const [upiForm,      setUpiForm]      = useState({ upiId: "", upiName: "" });
  const [savingUpi,    setSavingUpi]    = useState(false);
  const [celebrate,    setCelebrate]    = useState(false);
  const [locking,      setLocking]      = useState(false);

  useEffect(() => {
    if (matchId && isAuthenticated) void loadPoll();
  }, [matchId, isAuthenticated]);

  useEffect(() => {
    if (profile) setUpiForm({ upiId: profile.upiId ?? "", upiName: profile.upiName ?? profile.displayName ?? "" });
  }, [profile?.id]);

  const loadPoll = async () => {
    const res = await fetch(`/api/poll-list?matchId=${matchId}`, { credentials: "same-origin" });
    if (res.ok) {
      const data = await res.json() as { token?: string; pollData?: PollData };
      if (data.token) { setPollLink(`${window.location.origin}/p/${data.token}`); setPollData(data.pollData ?? null); }
    }
  };

  const createLink = async () => {
    if (!matchId) return;
    setCreating(true);
    try {
      const res  = await fetch("/api/poll", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ matchId, name: activeMatch?.title }),
      });
      const data = await res.json() as { link?: { token: string }; error?: string };
      if (!res.ok) throw new Error(data.error);
      const link = `${window.location.origin}/p/${data.link!.token}`;
      setPollLink(link);
      await copyToClipboard(link);
      setCopied("link");
      setTimeout(() => setCopied(null), 3000);
      await loadPoll();
    } catch (e) { setMsg({ text: e instanceof Error ? e.message : "Failed", error: true }); }
    finally { setCreating(false); }
  };

  const shareWhatsApp = () => {
    if (!pollLink || !activeMatch) return;
    const d = activeMatch.startsAt
      ? new Date(activeMatch.startsAt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
    const text = `🏏 *${activeMatch.title}*${d ? `\n📅 ${d}` : ""}${activeMatch.venueName ? `\n📍 ${activeMatch.venueName}` : ""}${activeMatch.pricePerPlayer > 0 ? `\n💰 ₹${activeMatch.pricePerPlayer} per player` : ""}\n\nCan you play? Tap ✅ Yes or ❌ No 👇\n👉 ${pollLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    track("match_shared_whatsapp", { matchId: matchId ?? "" });
  };

  const captainAction = async (responseId: string, action: "confirm" | "reject") => {
    setActionState(s => ({ ...s, [responseId]: action === "confirm" ? "confirming" : "rejecting" }));
    try {
      const res = await fetch("/api/poll", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ captainAction: action, responseId }),
      });
      if (!res.ok) { const d = await res.json() as { error?: string }; throw new Error(d.error ?? "Failed"); }
      if (action === "confirm") haptic("light");
      await loadPoll();
    } catch (e) { setMsg({ text: e instanceof Error ? e.message : "Action failed", error: true }); }
    finally { setActionState(s => ({ ...s, [responseId]: null })); }
  };

  const removePlayer = async (responseId: string) => {
    await fetch(`/api/poll?responseId=${responseId}`, { method: "DELETE", credentials: "same-origin" });
    await loadPoll();
  };

  const saveUpi = async () => {
    if (!upiForm.upiId.trim()) return;
    setSavingUpi(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ fullName: profile?.fullName ?? "", upiId: upiForm.upiId.trim(), upiName: upiForm.upiName.trim() || profile?.displayName }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMsg({ text: "✅ UPI saved! Players will see this on the payment screen.", error: false });
      setTimeout(() => setMsg(null), 4000);
    } catch (e) { setMsg({ text: e instanceof Error ? e.message : "Failed", error: true }); }
    finally { setSavingUpi(false); }
  };

  const handleLock = async () => {
    if (!matchId) return;
    setLocking(true);
    setMsg(null);
    try {
      await lockMatch(matchId);
      haptic("success");
      setCelebrate(true);
      setMsg({ text: "🔒 Squad locked! Strategy Room is now open.", error: false });
      track("match_squad_locked", { matchId });
      await loadMatch({ matchId });
    } catch (e) { setMsg({ text: e instanceof Error ? e.message : "Failed to lock", error: true }); }
    finally { setLocking(false); }
  };

  const handleReady = async () => {
    if (!matchId) return;
    try {
      await updateMatch({ matchId, nextState: "READY" });
      haptic("light");
      setMsg({ text: "✅ Match marked as ready!", error: false });
      await loadMatch({ matchId });
    } catch (e) { setMsg({ text: e instanceof Error ? e.message : "Failed", error: true }); }
  };

  const handleDelete = async () => {
    if (!matchId || !activeMatch) return;
    const count = activeMatch.participants.filter(p => ["CONFIRMED","LOCKED","PAYMENT_PENDING"].includes(p.status)).length;
    const confirm_ = window.confirm(
      count > 0
        ? `This match has ${count} player(s). It will be CANCELLED (not deleted) to preserve payment records. Continue?`
        : "Delete this match permanently? This cannot be undone."
    );
    if (!confirm_) return;
    try {
      const res  = await fetch(`/api/match/delete?matchId=${matchId}`, { method: "DELETE", credentials: "same-origin" });
      const data = await res.json() as { deleted?: boolean; cancelled?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMsg({ text: data.cancelled ? "Match cancelled." : "Match deleted.", error: false });
      setTimeout(() => { window.location.href = "/matches"; }, 1500);
    } catch (e) { setMsg({ text: e instanceof Error ? e.message : "Failed", error: true }); }
  };

  if (!matchId) return <main><div className="page"><p className="t-caption">No match ID.</p></div></main>;
  if (authLoading) return <main><Loader label="Loading…" /></main>;
  if (!isAuthenticated) return <main><div className="page"><AuthPanel title="Captain sign in" /></div></main>;
  if (matchLoading && !activeMatch) return <main><Loader label="Loading match…" /></main>;
  if (!activeMatch) return <main><div className="page"><p className="t-caption">Match not found.</p></div></main>;

  const allYes       = pollData?.responses.filter(r => r.response === "YES") ?? [];
  const needsReview  = allYes.filter(r => r.payment_claimed && r.captain_confirmed === null);
  const confirmed    = allYes.filter(r => r.captain_confirmed === true);
  const notPaid      = allYes.filter(r => !r.payment_claimed);
  const maybe        = pollData?.responses.filter(r => r.response === "MAYBE") ?? [];
  const appConfirmed = activeMatch.participants.filter(p => ["CONFIRMED","LOCKED"].includes(p.status)).length;
  const appPending   = activeMatch.participants.filter(p => p.status === "PAYMENT_PENDING").length;
  const totalConf    = confirmed.length + appConfirmed;
  const slotsLeft    = Math.max(0, activeMatch.squadSize - totalConf);
  const isLocked     = ["LOCKED","READY"].includes(activeMatch.status);

  const badgeClass   = STATUS_BADGE[activeMatch.status] ?? "";
  const statusLabel  = STATUS_LABELS[activeMatch.status] ?? activeMatch.status.replace(/_/g, " ");

  return (
    <main>
      <Confetti active={celebrate} count={90} origin={[50, 30]} />
      <div className="page">

        {/* ── Header card ────────────────────────────────────────────────── */}
        <div className="card animate-in" style={{ overflow: "hidden" }}>
          <div style={{ height: 4, background: isLocked ? "var(--green)" : needsReview.length > 0 ? "var(--amber)" : "var(--blue)" }} />
          <div className="card-pad">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <div>
                <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--blue)", marginBottom: 4 }}>
                  Captain Control
                </p>
                <h1 className="t-h2" style={{ lineHeight: 1.2 }}>{activeMatch.title}</h1>
                {activeMatch.venueName && <p className="t-caption" style={{ marginTop: 4 }}>📍 {activeMatch.venueName}</p>}
                {activeMatch.startsAt && (
                  <p className="t-caption" style={{ marginTop: 2 }}>
                    📅 {new Date(activeMatch.startsAt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
              <span className={`badge ${badgeClass}`} style={{ flexShrink: 0 }}>{statusLabel}</span>
            </div>

            {/* Stats strip */}
            <div className="stats-strip">
              <div className="stats-strip__item">
                <span className="stats-strip__num" style={{ color: "var(--green)" }}>{totalConf}</span>
                <span className="stats-strip__label">Confirmed</span>
              </div>
              <div className="stats-strip__item">
                <span className="stats-strip__num" style={{ color: needsReview.length > 0 ? "var(--amber)" : "var(--text-4)" }}>{needsReview.length}</span>
                <span className="stats-strip__label">To review</span>
              </div>
              <div className="stats-strip__item">
                <span className="stats-strip__num" style={{ color: "var(--text-3)" }}>{notPaid.length + appPending}</span>
                <span className="stats-strip__label">Unpaid</span>
              </div>
              <div className="stats-strip__item">
                <span className="stats-strip__num" style={{ color: slotsLeft > 0 ? "var(--blue)" : "var(--green)" }}>{slotsLeft}</span>
                <span className="stats-strip__label">Slots left</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="progress" style={{ marginTop: 12 }}>
              <div className="progress__fill" style={{ width: `${activeMatch.squadSize > 0 ? Math.min((totalConf / activeMatch.squadSize) * 100, 100) : 0}%`, background: isLocked ? "var(--green)" : "var(--blue)" }} />
            </div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="tab-bar">
          <button className={`tab ${tab === "overview" ? "tab--active" : ""}`} onClick={() => setTab("overview")}>
            📊 Overview
            {needsReview.length > 0 && (
              <span style={{ background: "var(--red)", color: "#fff", borderRadius: "var(--r-full)", padding: "0 6px", fontSize: 10, marginLeft: 4, fontFamily: "var(--font-display)", fontWeight: 700 }}>
                {needsReview.length}
              </span>
            )}
          </button>
          <button className={`tab ${tab === "players" ? "tab--active" : ""}`} onClick={() => setTab("players")}>👥 Players</button>
          <button className={`tab ${tab === "share"   ? "tab--active" : ""}`} onClick={() => setTab("share")}>📣 Share</button>
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Needs review — urgent banner */}
            {needsReview.length > 0 && (
              <div className="card animate-in" style={{ overflow: "hidden", border: "2px solid var(--amber-border)" }}>
                <div style={{ padding: "10px 16px", background: "var(--amber-soft)", borderBottom: "1px solid var(--amber-border)" }}>
                  <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, color: "#92400e" }}>
                    ⚡ {needsReview.length} payment{needsReview.length > 1 ? "s" : ""} to review
                  </p>
                </div>
                {needsReview.map(r => (
                  <div key={r.id} style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>{r.player_name}</p>
                        {r.player_phone && <p className="t-caption" style={{ marginTop: 2 }}>{r.player_phone}</p>}
                      </div>
                      <span className="badge badge-amber">📩 Claimed paid</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <button disabled={!!actionState[r.id]} onClick={() => void captainAction(r.id, "confirm")}
                        style={{ padding: "12px", border: "none", borderRadius: "var(--r-lg)", background: "var(--green)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, cursor: "pointer", opacity: !!actionState[r.id] ? 0.6 : 1 }}>
                        {actionState[r.id] === "confirming" ? "Confirming…" : "✅ Confirm"}
                      </button>
                      <button disabled={!!actionState[r.id]} onClick={() => void captainAction(r.id, "reject")}
                        style={{ padding: "12px", border: "1.5px solid var(--red-border)", borderRadius: "var(--r-lg)", background: "var(--red-soft)", color: "var(--red)", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, cursor: "pointer", opacity: !!actionState[r.id] ? 0.6 : 1 }}>
                        {actionState[r.id] === "rejecting" ? "Rejecting…" : "❌ Reject"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {needsReview.length === 0 && pollData && (
              <div className="card card-pad" style={{ textAlign: "center", background: "var(--green-soft)", border: "1px solid var(--green-border)" }}>
                <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--green)" }}>
                  ✅ All payments reviewed
                </p>
                <p className="t-caption" style={{ marginTop: 4 }}>{confirmed.length} confirmed · {notPaid.length} still need to pay</p>
              </div>
            )}

            {!pollData && (
              <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>Get started</p>
                  <p className="t-caption" style={{ marginTop: 4 }}>Create a WhatsApp link so players can respond and pay.</p>
                </div>
                <button onClick={() => setTab("share")} className="btn btn--primary btn--block">📣 Go to Share Tab</button>
              </div>
            )}

            {/* Match lifecycle actions */}
            <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>
                Actions
              </p>

              {(activeMatch.status === "RSVP_OPEN" || activeMatch.status === "PAYMENT_PENDING") && (
                <button onClick={() => void handleLock()} disabled={locking}
                  style={{ width: "100%", minHeight: 52, border: "none", borderRadius: "var(--r-lg)", background: locking ? "var(--line)" : "var(--blue)", color: locking ? "var(--text-3)" : "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, cursor: locking ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {locking ? <><span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Locking…</> : "🔒 Lock Squad"}
                </button>
              )}

              {activeMatch.status === "LOCKED" && (
                <button onClick={() => void handleReady()}
                  style={{ width: "100%", minHeight: 48, border: "1.5px solid var(--green-border)", borderRadius: "var(--r-lg)", background: "var(--green-soft)", color: "#166534", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                  ✅ Mark as Ready
                </button>
              )}

              {["LOCKED","READY"].includes(activeMatch.status) && (
                <Link href={`/match/attendance?matchId=${matchId}`} style={{ display: "block" }}>
                  <button style={{ width: "100%", minHeight: 48, border: "1.5px solid var(--line)", borderRadius: "var(--r-lg)", background: "transparent", color: "var(--text-2)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                    📋 Record Attendance
                  </button>
                </Link>
              )}

              {activeMatch.status === "READY" && (
                <Link href={`/match/motm?matchId=${matchId}`} style={{ display: "block" }}>
                  <button style={{ width: "100%", minHeight: 48, border: "1.5px solid var(--line)", borderRadius: "var(--r-lg)", background: "transparent", color: "var(--text-2)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                    ⭐ Player of the Match
                  </button>
                </Link>
              )}

              <Link href={`/match/room?matchId=${matchId}`} style={{ display: "block" }}>
                <button style={{ width: "100%", minHeight: 48, border: "1.5px solid var(--line)", borderRadius: "var(--r-lg)", background: "transparent", color: "var(--text-2)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  🧠 Strategy Room
                </button>
              </Link>

              {!["LOCKED","READY","CANCELLED"].includes(activeMatch.status) && (
                <button onClick={() => void handleDelete()}
                  style={{ width: "100%", minHeight: 44, border: "1.5px solid var(--red-border)", borderRadius: "var(--r-lg)", background: "var(--red-soft)", color: "var(--red)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  🗑️ Delete Match
                </button>
              )}
            </div>

            {msg && (
              <p style={{ margin: 0, padding: "12px 14px", borderRadius: "var(--r-md)", fontSize: 13, fontWeight: 600, background: msg.error ? "var(--red-soft)" : "var(--green-soft)", color: msg.error ? "#991b1b" : "#166534", border: `1px solid ${msg.error ? "var(--red-border)" : "var(--green-border)"}` }}>
                {msg.text}
              </p>
            )}
          </div>
        )}

        {/* ── PLAYERS TAB ──────────────────────────────────────────────────── */}
        {tab === "players" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* App-joined players (paid via Razorpay) */}
            {activeMatch.participants.length > 0 && (
              <div className="card" style={{ overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
                  <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    App players — {activeMatch.participants.length}
                  </p>
                </div>
                {activeMatch.participants.map((p, i) => (
                  <div key={p.participantId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < activeMatch.participants.length - 1 ? "1px solid var(--line)" : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: p.paymentStatus === "PAID" ? "var(--green-soft)" : "var(--amber-soft)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: p.paymentStatus === "PAID" ? "var(--green)" : "var(--amber)", flexShrink: 0, border: `1.5px solid ${p.paymentStatus === "PAID" ? "var(--green-border)" : "var(--amber-border)"}` }}>
                      {p.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{p.fullName}</p>
                      <p className="t-caption" style={{ marginTop: 2 }}>
                        {p.paymentStatus === "PAID" ? "💰 Paid via app" : "⏳ Payment pending"}
                      </p>
                    </div>
                    <span className={`badge ${p.paymentStatus === "PAID" ? "badge-green" : "badge-amber"}`}>
                      {["CONFIRMED","LOCKED"].includes(p.status) ? "Confirmed" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Poll-based players (link responses) */}
            {confirmed.length > 0 && (
              <div className="card" style={{ overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", background: "var(--green-soft)" }}>
                  <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Confirmed via link — {confirmed.length}
                  </p>
                </div>
                {confirmed.map((r, i) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < confirmed.length - 1 ? "1px solid var(--line)" : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--green-soft)", border: "1.5px solid var(--green-border)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: "var(--green)", flexShrink: 0 }}>
                      {r.player_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{r.player_name}</p>
                      {r.player_phone && <p className="t-caption" style={{ marginTop: 2 }}>{r.player_phone}</p>}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className="badge badge-green">Confirmed</span>
                      <button onClick={() => void removePlayer(r.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--red)", fontFamily: "var(--font-display)", fontWeight: 600 }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {notPaid.length > 0 && (
              <div className="card" style={{ overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
                  <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Said yes, not paid — {notPaid.length}
                  </p>
                </div>
                {notPaid.map((r, i) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < notPaid.length - 1 ? "1px solid var(--line)" : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--surface-2)", border: "1.5px solid var(--line)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: "var(--text-3)", flexShrink: 0 }}>
                      {r.player_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{r.player_name}</p>
                      {r.player_phone && <p className="t-caption" style={{ marginTop: 2 }}>{r.player_phone}</p>}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className="badge badge-amber">⏳ Unpaid</span>
                      <button onClick={() => void removePlayer(r.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--red)", fontFamily: "var(--font-display)", fontWeight: 600 }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {maybe.length > 0 && (
              <div className="card" style={{ overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
                  <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Maybe — {maybe.length}
                  </p>
                </div>
                {maybe.map((r, i) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < maybe.length - 1 ? "1px solid var(--line)" : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--surface-2)", border: "1.5px solid var(--line)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: "var(--text-3)", flexShrink: 0 }}>
                      {r.player_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, flex: 1 }}>{r.player_name}</p>
                    <span className="badge">🤔 Maybe</span>
                  </div>
                ))}
              </div>
            )}

            {confirmed.length === 0 && notPaid.length === 0 && activeMatch.participants.length === 0 && (
              <div className="card card-pad" style={{ textAlign: "center", padding: "32px 20px" }}>
                <p className="t-caption">No players yet. Share the match link to get responses.</p>
              </div>
            )}
          </div>
        )}

        {/* ── SHARE TAB ────────────────────────────────────────────────────── */}
        {tab === "share" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* UPI setup */}
            <div className="card card-pad">
              <p style={{ margin: "0 0 4px", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>💰 Your UPI details</p>
              <p className="t-caption" style={{ marginBottom: 14 }}>Players see this on the payment screen. Set it so you can receive money.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="field">
                  <label className="field-label">UPI ID</label>
                  <input className="input" placeholder="yourname@upi" value={upiForm.upiId}
                    onChange={e => setUpiForm(f => ({ ...f, upiId: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="field-label">Display name</label>
                  <input className="input" placeholder="Jason (Captain)" value={upiForm.upiName}
                    onChange={e => setUpiForm(f => ({ ...f, upiName: e.target.value }))} />
                </div>
                <button onClick={() => void saveUpi()} disabled={savingUpi || !upiForm.upiId.trim()}
                  className="btn btn--secondary btn--block">
                  {savingUpi ? "Saving…" : "Save UPI Details"}
                </button>
              </div>
            </div>

            {/* Match link */}
            {pollLink ? (
              <>
                <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>📣 Match link</p>
                  <div style={{ padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", fontSize: 13, fontFamily: "monospace", wordBreak: "break-all", color: "var(--blue)" }}>
                    {pollLink}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button onClick={async () => { await copyToClipboard(pollLink); setCopied("link"); setTimeout(() => setCopied(null), 2500); }}
                      className="btn btn--secondary btn--block">
                      {copied === "link" ? "✓ Copied!" : "📋 Copy Link"}
                    </button>
                    <button onClick={shareWhatsApp}
                      style={{ minHeight: 48, border: "none", borderRadius: "var(--r-lg)", background: "#25D366", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                      WhatsApp
                    </button>
                  </div>
                </div>

                {/* WhatsApp preview */}
                <div className="card card-pad">
                  <p style={{ margin: "0 0 10px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Message preview</p>
                  <div style={{ padding: "14px", background: "#f0fdf4", borderRadius: 12, border: "1px solid var(--green-border)", fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                    {`🏏 *${activeMatch.title}*\n${activeMatch.venueName ? `📍 ${activeMatch.venueName}\n` : ""}${activeMatch.startsAt ? `📅 ${new Date(activeMatch.startsAt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}\n` : ""}${activeMatch.pricePerPlayer > 0 ? `💰 ₹${activeMatch.pricePerPlayer} per player\n` : ""}\nCan you play? Tap ✅ YES or ❌ NO 👇\n👉 ${pollLink}`}
                  </div>
                  <button onClick={shareWhatsApp}
                    style={{ width: "100%", marginTop: 12, minHeight: 52, border: "none", borderRadius: "var(--r-lg)", background: "#25D366", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Send on WhatsApp
                  </button>
                </div>
              </>
            ) : (
              <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>Create your share link</p>
                  <p className="t-caption" style={{ marginTop: 4 }}>
                    One link — players open it, tap YES, pay, and appear here for you to confirm.
                  </p>
                </div>
                <button onClick={() => void createLink()} disabled={creating}
                  style={{ width: "100%", minHeight: 52, border: "none", borderRadius: "var(--r-lg)", background: "var(--blue)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.7 : 1 }}>
                  {creating ? "Creating…" : "📣 Create Link & Copy"}
                </button>
              </div>
            )}

            {msg && (
              <p style={{ margin: 0, padding: "12px 14px", borderRadius: "var(--r-md)", fontSize: 13, fontWeight: 600, background: msg.error ? "var(--red-soft)" : "var(--green-soft)", color: msg.error ? "#991b1b" : "#166534", border: `1px solid ${msg.error ? "var(--red-border)" : "var(--green-border)"}` }}>
                {msg.text}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function MatchControlPage() {
  return (
    <ErrorBoundary section="control panel">
      <Suspense fallback={<main><Loader label="Loading control panel…" /></main>}>
        <ControlPanelContent />
      </Suspense>
    </ErrorBoundary>
  );
}
