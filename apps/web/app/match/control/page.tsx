"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";
import { copyToClipboard } from "@/lib/helpers";

type AnonResponse = {
  id: string;
  player_name: string;
  player_phone: string | null;
  response: string;
  payment_claimed: boolean;
  captain_confirmed: boolean | null;
  rejection_note: string | null;
  created_at: string;
};

type PollData = {
  link: { id: string; token: string };
  responses: AnonResponse[];
  summary: { yes: number; no: number; maybe: number; total: number };
};

type ActionState = Record<string, "confirming" | "rejecting" | null>;

function ControlPanelContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("matchId");
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { activeMatch, loading: matchLoading, loadMatch, lockMatch, updateMatch } = useMatch(matchId);

  const [pollData, setPollData]   = useState<PollData | null>(null);
  const [pollLink, setPollLink]   = useState<string | null>(null);
  const [creating, setCreating]   = useState(false);
  const [copied, setCopied]       = useState<string | null>(null);
  const [msg, setMsg]             = useState<{ text: string; error: boolean } | null>(null);
  const [tab, setTab]             = useState<"overview" | "players" | "share">("overview");
  const [actionState, setActionState] = useState<ActionState>({});
  const [upiForm, setUpiForm]     = useState({ upiId: "", upiName: "" });
  const [savingUpi, setSavingUpi] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (matchId && isAuthenticated) void loadPoll();
  }, [matchId, isAuthenticated]);

  // Pre-fill UPI from profile
  useEffect(() => {
    if (profile) setUpiForm({ upiId: profile.upiId ?? "", upiName: profile.upiName ?? profile.displayName });
  }, [profile]);

  const loadPoll = async () => {
    const res = await fetch(`/api/poll-list?matchId=${matchId}`, { credentials: "same-origin" });
    if (res.ok) {
      const data = await res.json() as { token?: string; pollData?: PollData };
      if (data.token) {
        setPollLink(`${window.location.origin}/p/${data.token}`);
        setPollData(data.pollData ?? null);
      }
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
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Failed", error: true });
    } finally { setCreating(false); }
  };

  const shareWhatsApp = () => {
    if (!pollLink || !activeMatch) return;
    const d = activeMatch.startsAt ? new Date(activeMatch.startsAt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
    const msg = `🏏 ${activeMatch.title}${d ? `\n📅 ${d}` : ""}${activeMatch.venueName ? `\n📍 ${activeMatch.venueName}` : ""}\n\nCan you play?\n\n👉 ${pollLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const captainAction = async (responseId: string, action: "confirm" | "reject") => {
    setActionState((s) => ({ ...s, [responseId]: action === "confirm" ? "confirming" : "rejecting" }));
    try {
      const res = await fetch("/api/poll", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ captainAction: action, responseId }),
      });
      if (!res.ok) throw new Error("Failed");
      await loadPoll();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Failed", error: true });
    } finally { setActionState((s) => ({ ...s, [responseId]: null })); }
  };

  const removePlayer = async (responseId: string) => {
    await fetch(`/api/poll?responseId=${responseId}`, { method: "DELETE", credentials: "same-origin" });
    await loadPoll();
  };

  const saveUpi = async () => {
    if (!upiForm.upiId.trim()) return;
    setSavingUpi(true);
    try {
      await fetch("/api/auth", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ fullName: profile?.fullName ?? "", upiId: upiForm.upiId.trim(), upiName: upiForm.upiName.trim() || profile?.displayName }),
      });
      setMsg({ text: "UPI saved! Players will see this on the payment screen.", error: false });
    } finally { setSavingUpi(false); }
  };

  const handleLock  = async () => { if (!matchId) return; try { await lockMatch(matchId); setMsg({ text: "Squad locked! 🔒", error: false }); await loadMatch({ matchId }); } catch (e) { setMsg({ text: e instanceof Error ? e.message : "Failed", error: true }); } };
  const handleReady = async () => { if (!matchId) return; try { await updateMatch({ matchId, nextState: "READY" }); setMsg({ text: "Match ready! ✅", error: false }); await loadMatch({ matchId }); } catch (e) { setMsg({ text: e instanceof Error ? e.message : "Failed", error: true }); } };

  if (!matchId)        return <main><div className="page-shell"><p className="muted">No match ID.</p></div></main>;
  if (authLoading)     return <main><Loader label="Loading…" /></main>;
  if (!isAuthenticated) return <main><div className="page-shell"><AuthPanel title="Captain sign in" /></div></main>;
  if (matchLoading && !activeMatch) return <main><Loader label="Loading match…" /></main>;
  if (!activeMatch)    return <main><div className="page-shell"><p className="muted">Match not found.</p></div></main>;

  // Payment state groups
  const allYes      = pollData?.responses.filter((r) => r.response === "YES") ?? [];
  const needsReview = allYes.filter((r) => r.payment_claimed && r.captain_confirmed === null);
  const confirmed   = allYes.filter((r) => r.captain_confirmed === true);
  const rejected    = allYes.filter((r) => r.captain_confirmed === false);
  const notPaid     = allYes.filter((r) => !r.payment_claimed);
  const maybe       = pollData?.responses.filter((r) => r.response === "MAYBE") ?? [];
  const no          = pollData?.responses.filter((r) => r.response === "NO") ?? [];

  const appConfirmed = activeMatch.participants.filter((p) => ["CONFIRMED", "LOCKED"].includes(p.status)).length;
  const totalConfirmed = confirmed.length + appConfirmed;
  const slotsLeft    = Math.max(0, activeMatch.squadSize - totalConfirmed);
  const appPending   = activeMatch.participants.filter((p) => p.status === "PAYMENT_PENDING").length;

  const TAB = (t: typeof tab): React.CSSProperties => ({
    flex: 1, padding: "0.6rem", border: "none", borderRadius: "10px", cursor: "pointer",
    fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.8rem", transition: "all 150ms",
    background: tab === t ? "var(--surface)" : "transparent",
    color:      tab === t ? "var(--primary)" : "var(--text-faint)",
    boxShadow:  tab === t ? "var(--shadow-sm)" : "none",
  });

  const statusBadge = (s: string) => {
    const m = s.toUpperCase();
    if (m === "LOCKED" || m === "READY") return "badge-success";
    if (m === "PAYMENT_PENDING" || m === "RSVP_OPEN") return "badge-warning";
    return "";
  };

  return (
    <main>
      <div className="page-shell">
        {/* ── Header ── */}
        <section className="hero-panel animate-in">
          <div className="row-between" style={{ alignItems: "flex-start" }}>
            <div>
              <p className="eyebrow">Captain Control</p>
              <h1 className="title-lg" style={{ marginTop: "0.3rem" }}>{activeMatch.title}</h1>
              <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}>
                {activeMatch.venueName && `📍 ${activeMatch.venueName} · `}
                {activeMatch.startsAt && new Date(activeMatch.startsAt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <span className={`badge ${statusBadge(activeMatch.status)}`}>
              {activeMatch.status.replace(/_/g, " ")}
            </span>
          </div>

          {/* ── Stats bar ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.5rem", marginTop: "0.75rem" }}>
            {[
              { label: "Confirmed",    num: totalConfirmed, color: "var(--success)" },
              { label: "Needs review", num: needsReview.length, color: "var(--warning)" },
              { label: "Pending pay",  num: notPaid.length + appPending, color: "#888" },
              { label: "Slots left",   num: slotsLeft, color: slotsLeft > 0 ? "var(--primary)" : "var(--success)" },
            ].map(({ label, num, color }) => (
              <div key={label} className="metric" style={{ textAlign: "center" }}>
                <div className="eyebrow" style={{ fontSize: "0.65rem" }}>{label}</div>
                <strong style={{ fontSize: "1.4rem", color }}>{num}</strong>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: "0.3rem", padding: "0.3rem", background: "var(--surface-muted)", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
          <button style={TAB("overview")} onClick={() => setTab("overview")}>
            📊 Overview {needsReview.length > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: "999px", padding: "0 6px", fontSize: "0.7rem", marginLeft: "4px" }}>{needsReview.length}</span>}
          </button>
          <button style={TAB("players")}  onClick={() => setTab("players")}>👥 Players</button>
          <button style={TAB("share")}    onClick={() => setTab("share")}>📣 Share</button>
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div style={{ display: "grid", gap: "1rem" }}>

            {/* NEEDS REVIEW — most important section */}
            {needsReview.length > 0 && (
              <div className="panel animate-in" style={{ border: "2px solid var(--warning)", borderRadius: "var(--radius-md)", padding: "1rem", display: "grid", gap: "0.75rem" }}>
                <div className="row-between">
                  <p className="eyebrow" style={{ color: "var(--warning)" }}>⚡ {needsReview.length} payment{needsReview.length > 1 ? "s" : ""} to review</p>
                </div>
                {needsReview.map((r) => (
                  <div key={r.id} style={{ padding: "0.75rem", background: "var(--surface-muted)", borderRadius: "var(--radius-sm)", display: "grid", gap: "0.6rem" }}>
                    <div className="row-between">
                      <div>
                        <strong style={{ fontSize: "1rem" }}>{r.player_name}</strong>
                        {r.player_phone && <div className="faint" style={{ fontSize: "0.8rem" }}>{r.player_phone}</div>}
                      </div>
                      <span className="badge badge-warning">📩 Claimed paid</span>
                    </div>
                    <div className="grid grid-2" style={{ gap: "0.5rem" }}>
                      <button
                        disabled={!!actionState[r.id]}
                        onClick={() => void captainAction(r.id, "confirm")}
                        style={{ padding: "0.65rem", border: "none", borderRadius: "var(--radius-sm)", background: "var(--success)", color: "#fff", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>
                        {actionState[r.id] === "confirming" ? "…" : "✅ Confirm"}
                      </button>
                      <button
                        disabled={!!actionState[r.id]}
                        onClick={() => void captainAction(r.id, "reject")}
                        style={{ padding: "0.65rem", border: "1.5px solid var(--danger)", borderRadius: "var(--radius-sm)", background: "transparent", color: "var(--danger)", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>
                        {actionState[r.id] === "rejecting" ? "…" : "❌ Reject"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {needsReview.length === 0 && pollData && (
              <div className="panel" style={{ textAlign: "center", padding: "1.5rem" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>✅</div>
                <p style={{ margin: 0, fontWeight: 700 }}>All payments reviewed</p>
                <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  {confirmed.length} confirmed · {notPaid.length} still need to pay
                </p>
              </div>
            )}

            {!pollData && (
              <Card eyebrow="Get started" title="Share your match link">
                <p className="muted" style={{ fontSize: "0.9rem" }}>
                  Create a link and send it on WhatsApp. Players tap YES and pay — you confirm.
                </p>
                <Button onClick={() => setTab("share")} block>📣 Go to Share</Button>
              </Card>
            )}

            {/* Lifecycle */}
            <Card eyebrow="Match actions" title="Lifecycle">
              <div className="form-grid">
                {(activeMatch.status === "RSVP_OPEN" || activeMatch.status === "PAYMENT_PENDING") && (
                  <Button onClick={() => void handleLock()} block>🔒 Lock Squad</Button>
                )}
                {activeMatch.status === "LOCKED" && (
                  <Button variant="secondary" onClick={() => void handleReady()} block>✅ Mark Ready</Button>
                )}
                {/* Post-match attendance */}
            {(activeMatch.status === "READY" || activeMatch.status === "LOCKED") && (
              <Link href={`/match/attendance?matchId=${matchId}`}>
                <Button variant="ghost" block>📋 Record Attendance</Button>
              </Link>
            )}
            <Link href={`/match/room?matchId=${matchId}`}>
                  <Button variant="ghost" block>🧠 Strategy Room</Button>
                </Link>
              </div>
            </Card>

            {msg && <p className={`message-strip${msg.error ? " error" : " success"}`}>{msg.text}</p>}
          </div>
        )}

        {/* ── PLAYERS ── */}
        {tab === "players" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            {/* Confirmed */}
            {confirmed.length > 0 && (
              <Card eyebrow={`Confirmed — ${confirmed.length}`} title="Paid & confirmed">
                <div className="list">
                  {confirmed.map((r) => (
                    <div key={r.id} className="list-row">
                      <div>
                        <strong>{r.player_name}</strong>
                        {r.player_phone && <div className="faint" style={{ fontSize: "0.78rem" }}>{r.player_phone}</div>}
                      </div>
                      <div className="row" style={{ gap: "0.5rem" }}>
                        <span className="badge badge-success">✅ Confirmed</span>
                        <button onClick={() => void removePlayer(r.id)} style={{ all: "unset", cursor: "pointer", fontSize: "0.72rem", color: "var(--danger)" }}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Not paid */}
            {notPaid.length > 0 && (
              <Card eyebrow={`Not paid yet — ${notPaid.length}`} title="Responded YES but no payment">
                <div className="list">
                  {notPaid.map((r) => (
                    <div key={r.id} className="list-row">
                      <div>
                        <strong>{r.player_name}</strong>
                        {r.player_phone && <div className="faint" style={{ fontSize: "0.78rem" }}>{r.player_phone}</div>}
                      </div>
                      <div className="row" style={{ gap: "0.5rem" }}>
                        <span className="badge">⏳ Unpaid</span>
                        <button onClick={() => void removePlayer(r.id)} style={{ all: "unset", cursor: "pointer", fontSize: "0.72rem", color: "var(--danger)" }}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Maybe */}
            {maybe.length > 0 && (
              <Card eyebrow={`Maybe — ${maybe.length}`} title="Uncertain">
                <div className="list">
                  {maybe.map((r) => (
                    <div key={r.id} className="list-row">
                      <strong>{r.player_name}</strong>
                      <span className="badge">🤔 Maybe</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* App players */}
            {activeMatch.participants.length > 0 && (
              <Card eyebrow="Via app" title="App-joined players">
                <div className="list">
                  {activeMatch.participants.map((p) => (
                    <div key={p.participantId} className="list-row">
                      <div>
                        <strong>{p.fullName}</strong>
                        <div className="faint" style={{ fontSize: "0.78rem" }}>{p.status}</div>
                      </div>
                      <span className={`badge ${p.paymentStatus === "PAID" ? "badge-success" : "badge-warning"}`}>
                        {p.paymentStatus === "PAID" ? "Paid" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {confirmed.length === 0 && notPaid.length === 0 && activeMatch.participants.length === 0 && (
              <div className="panel" style={{ textAlign: "center", padding: "2rem" }}>
                <p className="muted">No players yet. Share the link to get responses.</p>
              </div>
            )}
          </div>
        )}

        {/* ── SHARE ── */}
        {tab === "share" && (
          <div style={{ display: "grid", gap: "1rem" }}>

            {/* UPI setup */}
            <Card eyebrow="Your UPI" title="Set your payment details">
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                Players will see this on the payment screen after clicking &ldquo;I&apos;m In&rdquo;.
              </p>
              <div className="form-grid">
                <label className="label">
                  UPI ID
                  <input className="input" placeholder="yourname@upi" value={upiForm.upiId}
                    onChange={(e) => setUpiForm((f) => ({ ...f, upiId: e.target.value }))} />
                </label>
                <label className="label">
                  Display name
                  <input className="input" placeholder="Jason (Captain)" value={upiForm.upiName}
                    onChange={(e) => setUpiForm((f) => ({ ...f, upiName: e.target.value }))} />
                </label>
                <Button onClick={() => void saveUpi()} loading={savingUpi} variant="secondary" block>
                  Save UPI Details
                </Button>
              </div>
            </Card>

            {pollLink ? (
              <>
                <Card eyebrow="Match link" title="Share with players">
                  <div style={{ padding: "0.75rem", background: "var(--surface-muted)", borderRadius: "var(--radius-sm)", fontSize: "0.82rem", wordBreak: "break-all", border: "1px solid var(--line)", width: "100%" }}>
                    {pollLink}
                  </div>
                  <div className="cluster">
                    <Button variant="secondary" onClick={async () => { await copyToClipboard(pollLink); setCopied("link"); setTimeout(() => setCopied(null), 2000); }}>
                      {copied === "link" ? "✓ Copied!" : "Copy Link"}
                    </Button>
                    <Button onClick={shareWhatsApp} style={{ background: "#25D366", color: "#fff" }}>
                      WhatsApp
                    </Button>
                  </div>
                </Card>

                <Card eyebrow="WhatsApp preview" title="Message to send">
                  <div style={{ padding: "0.9rem 1rem", background: "#f0fdf4", borderRadius: "12px", border: "1px solid #bbf7d0", fontSize: "0.88rem", lineHeight: 1.75, whiteSpace: "pre-wrap", width: "100%", textAlign: "left" }}>
                    {`🏏 ${activeMatch.title}\n📍 ${activeMatch.venueName ?? ""}\n\nCan you play?\n\n👉 ${pollLink}`}
                  </div>
                  <Button onClick={shareWhatsApp} style={{ background: "#25D366", color: "#fff" }} block>
                    Open WhatsApp
                  </Button>
                </Card>
              </>
            ) : (
              <Card eyebrow="No link yet" title="Create your share link">
                <p className="muted" style={{ fontSize: "0.9rem" }}>
                  One link — players open it, tap YES, pay you, and their name appears here for you to confirm.
                </p>
                <Button onClick={() => void createLink()} loading={creating} block>
                  Create Link & Copy
                </Button>
              </Card>
            )}

            {msg && <p className={`message-strip${msg.error ? " error" : " success"}`}>{msg.text}</p>}
          </div>
        )}
      </div>
    </main>
  );
}

export default function MatchControlPage() {
  return (
    <Suspense fallback={<main><Loader label="Loading control panel…" /></main>}>
      <ControlPanelContent />
    </Suspense>
  );
}
