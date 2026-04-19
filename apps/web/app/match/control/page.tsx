"use client";

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
  response: string;
  payment_claimed: boolean;
  payment_note: string | null;
  created_at: string;
};

type PollData = {
  link: { id: string; token: string };
  responses: AnonResponse[];
  summary: { yes: number; no: number; maybe: number; total: number };
};

function ControlPanelContent() {
  const searchParams = useSearchParams();
  const matchId      = searchParams.get("matchId");
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { activeMatch, loading: matchLoading, loadMatch, lockMatch, updateMatch } = useMatch(matchId);

  const [pollData, setPollData]   = useState<PollData | null>(null);
  const [pollLink, setPollLink]   = useState<string | null>(null);
  const [creating, setCreating]   = useState(false);
  const [copied, setCopied]       = useState<string | null>(null);
  const [msg, setMsg]             = useState<{ text: string; error: boolean } | null>(null);
  const [tab, setTab]             = useState<"overview" | "players" | "poll">("overview");

  // Load or create poll link for this match
  useEffect(() => {
    if (!matchId || !isAuthenticated) return;
    void loadPoll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, isAuthenticated]);

  const loadPoll = async () => {
    // Check if a poll link exists for this match
    const res  = await fetch(`/api/poll-list?matchId=${matchId}`, { credentials: "same-origin" });
    if (res.ok) {
      const data = await res.json() as { token?: string; pollData?: PollData };
      if (data.token) {
        setPollLink(`${window.location.origin}/p/${data.token}`);
        setPollData(data.pollData ?? null);
      }
    }
  };

  const createPollLink = async () => {
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
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Failed", error: true });
    } finally { setCreating(false); }
  };

  const copyLink = async (text: string, key: string) => {
    await copyToClipboard(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareWhatsApp = () => {
    if (!pollLink || !activeMatch) return;
    const text = encodeURIComponent(
      `🏏 ${activeMatch.title}\n` +
      (activeMatch.venueName ? `📍 ${activeMatch.venueName}\n` : "") +
      `\nCan you play?\n\n👉 ${pollLink}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const confirmPlayer = async (responseId: string) => {
    // Mark as confirmed in anon_responses — captain action
    await fetch("/api/poll", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
      body: JSON.stringify({ pollLinkId: pollData?.link.id, playerName: "", response: "YES", responseId, paymentClaimed: true }),
    });
    await loadPoll();
  };

  const removePlayer = async (responseId: string) => {
    await fetch(`/api/poll?responseId=${responseId}`, { method: "DELETE", credentials: "same-origin" });
    await loadPoll();
  };

  const handleLock = async () => {
    if (!matchId) return;
    try {
      await lockMatch(matchId);
      setMsg({ text: "Squad locked! 🔒", error: false });
      await loadMatch({ matchId });
    } catch (err) { setMsg({ text: err instanceof Error ? err.message : "Failed", error: true }); }
  };

  const handleReady = async () => {
    if (!matchId) return;
    try {
      await updateMatch({ matchId, nextState: "READY" });
      setMsg({ text: "Match ready! ✅", error: false });
      await loadMatch({ matchId });
    } catch (err) { setMsg({ text: err instanceof Error ? err.message : "Failed", error: true }); }
  };

  if (!matchId) return <main><div className="page-shell" style={{ padding: "3rem 1rem", textAlign: "center" }}><p>No match ID provided.</p></div></main>;
  if (authLoading) return <main><Loader label="Loading…" /></main>;
  if (!isAuthenticated) return <main><div className="page-shell"><AuthPanel title="Captain sign in" /></div></main>;
  if (matchLoading && !activeMatch) return <main><Loader label="Loading match…" /></main>;
  if (!activeMatch) return <main><div style={{ textAlign: "center", padding: "3rem" }}><p>Match not found.</p></div></main>;

  const isCaptain = activeMatch.captainId === profile?.id;
  const yes       = pollData?.summary.yes ?? 0;
  const maybe     = pollData?.summary.maybe ?? 0;
  const no        = pollData?.summary.no ?? 0;
  const confirmed = activeMatch.participants.filter((p) => ["CONFIRMED", "LOCKED"].includes(p.status)).length;
  const pending   = activeMatch.participants.filter((p) => p.status === "PAYMENT_PENDING").length;
  const slotsLeft = Math.max(0, activeMatch.squadSize - confirmed);
  const yesPlayers    = pollData?.responses.filter((r) => r.response === "YES") ?? [];
  const claimedPayers = yesPlayers.filter((r) => r.payment_claimed);
  const unclaimed     = yesPlayers.filter((r) => !r.payment_claimed);

  const TAB = (t: typeof tab) => ({
    flex: 1, padding: "0.6rem", border: "none", borderRadius: "10px", cursor: "pointer",
    fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.8rem", transition: "all 150ms",
    background: tab === t ? "var(--surface)" : "transparent",
    color:      tab === t ? "var(--primary)" : "var(--text-faint)",
    boxShadow:  tab === t ? "var(--shadow-sm)" : "none",
  } as React.CSSProperties);

  return (
    <main>
      <div className="page-shell">
        {/* Header */}
        <section className="hero-panel animate-in">
          <div className="row-between" style={{ alignItems: "flex-start" }}>
            <div>
              <p className="eyebrow">Captain Control</p>
              <h1 className="title-lg" style={{ marginTop: "0.3rem" }}>{activeMatch.title}</h1>
              <p className="muted" style={{ fontSize: "0.88rem", marginTop: "0.25rem" }}>
                📍 {activeMatch.venueName}
                {activeMatch.startsAt && ` · ${new Date(activeMatch.startsAt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
              </p>
            </div>
            <span className={`badge ${activeMatch.status === "LOCKED" || activeMatch.status === "READY" ? "badge-success" : "badge-warning"}`}>
              {activeMatch.status.replace("_", " ")}
            </span>
          </div>

          {/* Quick stats */}
          <div className="grid grid-3" style={{ gap: "0.6rem", marginTop: "0.5rem" }}>
            <div className="metric">
              <div className="eyebrow">Confirmed</div>
              <strong style={{ fontSize: "1.5rem", color: "var(--success)" }}>{confirmed}</strong>
              <div className="faint" style={{ fontSize: "0.75rem" }}>of {activeMatch.squadSize}</div>
            </div>
            <div className="metric">
              <div className="eyebrow">Pending pay</div>
              <strong style={{ fontSize: "1.5rem", color: "var(--warning)" }}>{pending}</strong>
            </div>
            <div className="metric">
              <div className="eyebrow">Slots left</div>
              <strong style={{ fontSize: "1.5rem", color: slotsLeft > 0 ? "var(--primary)" : "var(--success)" }}>
                {slotsLeft}
              </strong>
            </div>
          </div>
        </section>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: "0.3rem", padding: "0.3rem", background: "var(--surface-muted)", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
          <button style={TAB("overview")}  onClick={() => setTab("overview")}>📊 Overview</button>
          <button style={TAB("players")}   onClick={() => setTab("players")}>👥 Players</button>
          <button style={TAB("poll")}      onClick={() => setTab("poll")}>📣 Share</button>
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            {/* Poll responses summary */}
            {pollData && (
              <Card eyebrow="Poll responses" title="Who responded?">
                <div className="grid grid-3" style={{ gap: "0.6rem" }}>
                  <div className="metric" style={{ textAlign: "center" }}>
                    <div className="eyebrow">Yes</div>
                    <strong style={{ fontSize: "1.8rem", color: "var(--success)" }}>{yes}</strong>
                  </div>
                  <div className="metric" style={{ textAlign: "center" }}>
                    <div className="eyebrow">Maybe</div>
                    <strong style={{ fontSize: "1.8rem", color: "var(--warning)" }}>{maybe}</strong>
                  </div>
                  <div className="metric" style={{ textAlign: "center" }}>
                    <div className="eyebrow">No</div>
                    <strong style={{ fontSize: "1.8rem", color: "var(--danger)" }}>{no}</strong>
                  </div>
                </div>
                {claimedPayers.length > 0 && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <p className="eyebrow" style={{ marginBottom: "0.5rem" }}>💰 Claimed payment ({claimedPayers.length})</p>
                    {claimedPayers.map((r) => (
                      <div key={r.id} className="list-row">
                        <strong style={{ fontSize: "0.95rem" }}>{r.player_name}</strong>
                        <div className="row" style={{ gap: "0.5rem" }}>
                          <span className="badge badge-warning">Claimed paid</span>
                          <button onClick={() => void removePlayer(r.id)} style={{ all: "unset", cursor: "pointer", fontSize: "0.75rem", color: "var(--danger)" }}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Lifecycle actions */}
            {isCaptain && (
              <Card eyebrow="Actions" title="Match lifecycle">
                <div className="form-grid">
                  {activeMatch.status === "PAYMENT_PENDING" && (
                    <Button onClick={() => void handleLock()} block>🔒 Lock Paid Squad</Button>
                  )}
                  {activeMatch.status === "LOCKED" && (
                    <Button variant="secondary" onClick={() => void handleReady()} block>✅ Mark Match Ready</Button>
                  )}
                  <Link href={`/match/room?matchId=${matchId}`}>
                    <Button variant="ghost" block>🧠 Open Strategy Room</Button>
                  </Link>
                </div>
              </Card>
            )}

            {msg && <p className={`message-strip${msg.error ? " error" : " success"}`}>{msg.text}</p>}
          </div>
        )}

        {/* ── PLAYERS TAB ── */}
        {tab === "players" && (
          <Card eyebrow="Squad" title="Player list">
            {/* App-joined players */}
            {activeMatch.participants.length > 0 && (
              <div className="list">
                {activeMatch.participants.map((p) => (
                  <div key={p.participantId} className="list-row">
                    <div className="row">
                      <div className="avatar" style={{ fontSize: "0.85rem" }}>
                        {p.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <strong style={{ fontSize: "0.95rem" }}>{p.fullName}</strong>
                        <div className="faint" style={{ fontSize: "0.78rem" }}>
                          {p.status === "CONFIRMED" ? "✅ Confirmed" : p.status === "PAYMENT_PENDING" ? "⏳ Pending" : p.status}
                        </div>
                      </div>
                    </div>
                    <span className={`badge ${p.paymentStatus === "PAID" ? "badge-success" : p.status === "PAYMENT_PENDING" ? "badge-warning" : ""}`}>
                      {p.paymentStatus === "PAID" ? "Paid" : p.status === "PAYMENT_PENDING" ? "Pending payment" : p.paymentStatus.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Poll-only responses (not yet app users) */}
            {yesPlayers.length > 0 && (
              <>
                <p className="eyebrow" style={{ marginTop: "1rem" }}>Via poll link</p>
                <div className="list">
                  {yesPlayers.map((r) => (
                    <div key={r.id} className="list-row">
                      <div>
                        <strong style={{ fontSize: "0.95rem" }}>{r.player_name}</strong>
                        <div className="faint" style={{ fontSize: "0.78rem" }}>
                          {r.payment_claimed ? "📩 Claimed paid" : "Needs to pay"}
                        </div>
                      </div>
                      <div className="row" style={{ gap: "0.5rem" }}>
                        {r.payment_claimed && (
                          <span className="badge badge-warning">Claimed</span>
                        )}
                        <button onClick={() => void removePlayer(r.id)}
                          style={{ all: "unset", cursor: "pointer", fontSize: "0.75rem", color: "var(--danger)", fontWeight: 600 }}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeMatch.participants.length === 0 && yesPlayers.length === 0 && (
              <p className="muted" style={{ textAlign: "center", padding: "1.5rem 0", fontSize: "0.9rem" }}>
                No players yet. Share the link to get responses.
              </p>
            )}
          </Card>
        )}

        {/* ── SHARE TAB ── */}
        {tab === "poll" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            {pollLink ? (
              <>
                <Card eyebrow="Your link" title="Share with players">
                  <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", background: "var(--surface-muted)", fontSize: "0.82rem", color: "var(--text-muted)", wordBreak: "break-all", border: "1px solid var(--line)" }}>
                    {pollLink}
                  </div>
                  <div className="cluster">
                    <Button onClick={() => void copyLink(pollLink, "link")} variant="secondary">
                      {copied === "link" ? "✓ Copied!" : "Copy Link"}
                    </Button>
                    <Button onClick={shareWhatsApp} style={{ background: "#25D366", color: "#fff" }}>
                      Share on WhatsApp
                    </Button>
                  </div>
                  <p className="muted" style={{ fontSize: "0.82rem", textAlign: "center" }}>
                    Players don&apos;t need an account · Works on any phone
                  </p>
                </Card>

                <Card eyebrow="WhatsApp message" title="Ready to send">
                  <div style={{ padding: "1rem", background: "#f0fdf4", borderRadius: "var(--radius-sm)", border: "1px solid #bbf7d0", fontSize: "0.9rem", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {`🏏 ${activeMatch.title}\n📍 ${activeMatch.venueName}\n\nCan you play?\n\n👉 ${pollLink}`}
                  </div>
                  <Button onClick={shareWhatsApp} style={{ background: "#25D366", color: "#fff" }} block>
                    Open WhatsApp
                  </Button>
                </Card>
              </>
            ) : (
              <Card eyebrow="Poll link" title="Create a share link">
                <p className="muted" style={{ fontSize: "0.9rem" }}>
                  Generate a link players can open without logging in. They tap YES / NO in seconds.
                </p>
                <Button onClick={() => void createPollLink()} loading={creating} block>
                  📣 Create & Copy Poll Link
                </Button>
              </Card>
            )}
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
