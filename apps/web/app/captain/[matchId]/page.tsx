"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";
import { copyToClipboard } from "@/lib/helpers";

type GuestParticipant = {
  id: string;
  display_name: string;
  phone: string | null;
  status: "PENDING_PAYMENT" | "CLAIMED_PAID" | "CONFIRMED" | "REJECTED" | "CANT_PLAY";
  claimed_paid_at: string | null;
};

const STATUS_CONFIG = {
  CONFIRMED:       { label: "Confirmed ✅", cls: "badge-success", bg: "#dcfce7" },
  CLAIMED_PAID:    { label: "Claimed Paid 💰", cls: "badge-warning", bg: "#fef3c7" },
  PENDING_PAYMENT: { label: "Pending ⏳", cls: "", bg: "#f4f4f5" },
  REJECTED:        { label: "Rejected ❌", cls: "badge-danger", bg: "#fde8e5" },
  CANT_PLAY:       { label: "Can't play", cls: "", bg: "#f4f4f5" },
} as const;

export default function CaptainControlPage() {
  const params = useParams<{ matchId: string }>();
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { activeMatch, loading, loadMatch, lockMatch } = useMatch(params.matchId);

  const [guests, setGuests]     = useState<GuestParticipant[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [waCopied, setWaCopied] = useState(false);
  const [msg, setMsg]           = useState<{ text: string; error: boolean } | null>(null);
  const [locking, setLocking]   = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (isAuthenticated && params.matchId) void loadGuests(); }, [isAuthenticated, params.matchId]);

  const loadGuests = async () => {
    const res  = await fetch(`/api/match/guests?matchId=${params.matchId}`, { credentials: "same-origin" });
    const data = await res.json() as { guests: GuestParticipant[] };
    setGuests(data.guests ?? []);
  };

  const updateGuest = async (guestId: string, status: "CONFIRMED" | "REJECTED") => {
    await fetch("/api/match/guests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ guestId, status, matchId: params.matchId }),
    });
    await loadGuests();
    await loadMatch({ matchId: params.matchId });
  };

  const replaceGuest = async (guestId: string) => {
    await fetch("/api/match/guests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ guestId, status: "REJECTED", matchId: params.matchId }),
    });
    await loadGuests();
    // Copy share link so captain can immediately invite a replacement
    const link = `${window.location.origin}/p/${params.matchId}`;
    await copyToClipboard(link);
    setMsg({ text: "Player removed. Share link copied — send to replacement!", error: false });
  };

  const handleLock = async () => {
    setLocking(true);
    try {
      await lockMatch(params.matchId);
      setMsg({ text: "Squad locked! 🔒 Match is ready.", error: false });
      await loadMatch({ matchId: params.matchId });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Failed", error: true });
    } finally { setLocking(false); }
  };

  const shareLink = `${typeof window !== "undefined" ? window.location.origin : "https://korum.vercel.app"}/p/${params.matchId}`;

  const copyLink = async () => {
    await copyToClipboard(shareLink);
    setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000);
  };

  const shareWhatsApp = async () => {
    if (!activeMatch) return;
    const d = new Date(activeMatch.startsAt);
    const dateStr = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const txt = `⚽ *${activeMatch.title}*\n📅 ${dateStr} at ${timeStr}\n📍 ${activeMatch.venueName}\n💰 ₹${activeMatch.pricePerPlayer}\n\n👥 ${activeMatch.confirmedCount ?? 0}/${activeMatch.squadSize} players\n\nCan you play?\n👉 ${shareLink}`;
    const wa  = `https://wa.me/?text=${encodeURIComponent(txt)}`;
    window.open(wa, "_blank");
    setWaCopied(true); setTimeout(() => setWaCopied(false), 3000);
  };

  if (!authLoading && !isAuthenticated) {
    return <main><div className="page-shell"><AuthPanel title="Sign in to access captain controls" /></div></main>;
  }
  if (authLoading || (loading && !activeMatch)) return <main><Loader label="Loading…" /></main>;
  if (!activeMatch) return <main><div style={{ padding: "2rem", textAlign: "center" }}><h2>Match not found</h2></div></main>;

  const isCaptain = activeMatch.captainId === profile?.id;

  // All players: confirmed auth participants + confirmed guests
  const confirmedAuth  = activeMatch.participants.filter((p) => ["CONFIRMED", "LOCKED"].includes(p.status));
  const confirmedGuests = guests.filter((g) => g.status === "CONFIRMED");
  const claimedGuests  = guests.filter((g) => g.status === "CLAIMED_PAID");
  const pendingGuests  = guests.filter((g) => g.status === "PENDING_PAYMENT");
  const totalConfirmed = confirmedAuth.length + confirmedGuests.length;
  const slotsLeft      = Math.max(0, activeMatch.squadSize - totalConfirmed);
  const isLocked       = ["LOCKED", "READY"].includes(activeMatch.status);

  return (
    <main>
      <div className="page-shell">
        {/* Header */}
        <section className="hero-panel animate-in">
          <div className="row-between" style={{ alignItems: "flex-start" }}>
            <div>
              <p className="eyebrow">Captain Panel</p>
              <h1 className="title-lg" style={{ marginTop: "0.3rem" }}>{activeMatch.title}</h1>
              <p className="muted" style={{ fontSize: "0.88rem", marginTop: "0.2rem" }}>
                {new Date(activeMatch.startsAt).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                {" · "}{activeMatch.venueName}
              </p>
            </div>
            <Link href={`/match/${params.matchId}`}>
              <Button variant="ghost" size="sm">Match ↗</Button>
            </Link>
          </div>

          {/* Status bar */}
          <div className="grid grid-3" style={{ gap: "0.6rem", marginTop: "0.75rem" }}>
            {[
              { label: "Confirmed",  value: totalConfirmed, color: "var(--success)" },
              { label: "Slots left", value: slotsLeft,      color: slotsLeft === 0 ? "var(--danger)" : "var(--warning)" },
              { label: "Claimed paid", value: claimedGuests.length, color: claimedGuests.length > 0 ? "var(--warning)" : "var(--text-faint)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="metric" style={{ textAlign: "center" }}>
                <strong style={{ fontSize: "1.6rem", color }}>{value}</strong>
                <div className="eyebrow">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Share section */}
        <section className="panel animate-in" style={{ display: "grid", gap: "0.75rem" }}>
          <p className="eyebrow">Share to fill squad</p>
          <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", background: "var(--surface-muted)", fontSize: "0.8rem", color: "var(--text-muted)", wordBreak: "break-all", border: "1px solid var(--line)", fontFamily: "monospace" }}>
            {shareLink}
          </div>
          <div className="cluster">
            <Button size="sm" variant="secondary" onClick={() => void copyLink()}>
              {linkCopied ? "✓ Copied!" : "📋 Copy Link"}
            </Button>
            <Button size="sm" onClick={() => void shareWhatsApp()}>
              {waCopied ? "✓ Opened!" : "📲 Share to WhatsApp"}
            </Button>
          </div>
        </section>

        {/* Action needed: claimed paid */}
        {claimedGuests.length > 0 && (
          <section className="panel animate-in" style={{ display: "grid", gap: "0.75rem", border: "1.5px solid var(--warning)", background: "#fffbeb" }}>
            <div className="row-between">
              <div>
                <p className="eyebrow" style={{ color: "var(--warning)" }}>Action needed</p>
                <h3 className="title-md">Payment claims to verify</h3>
              </div>
              <span className="badge badge-warning">{claimedGuests.length}</span>
            </div>
            <div className="list">
              {claimedGuests.map((g) => (
                <div key={g.id} className="list-row">
                  <div>
                    <strong>{g.display_name}</strong>
                    {g.phone && <div className="faint" style={{ fontSize: "0.8rem" }}>{g.phone}</div>}
                    <div className="faint" style={{ fontSize: "0.78rem" }}>
                      Claimed {g.claimed_paid_at ? new Date(g.claimed_paid_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </div>
                  </div>
                  <div className="cluster" style={{ gap: "0.5rem" }}>
                    <Button size="sm" onClick={() => void updateGuest(g.id, "CONFIRMED")}>
                      ✅ Confirm
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void replaceGuest(g.id)}>
                      Replace
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Full squad list */}
        <section className="panel animate-in" style={{ display: "grid", gap: "1rem" }}>
          <div className="row-between">
            <div>
              <p className="eyebrow">Squad</p>
              <h3 className="title-md">{totalConfirmed} / {activeMatch.squadSize} confirmed</h3>
            </div>
            {isLocked && <span className="badge badge-success">🔒 Locked</span>}
          </div>

          {/* Progress bar */}
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${Math.min(100, (totalConfirmed / activeMatch.squadSize) * 100)}%` }} />
          </div>

          <div className="list">
            {/* Auth participants */}
            {activeMatch.participants.map((p) => {
              const isIn = ["CONFIRMED", "LOCKED"].includes(p.status);
              return (
                <div key={p.participantId} className="list-row">
                  <div className="row">
                    <div className="avatar">{p.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}</div>
                    <div>
                      <strong>{p.fullName}</strong>
                      <div className="faint" style={{ fontSize: "0.78rem" }}>{p.phone}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem" }}>
                    <span className={`badge ${isIn ? "badge-success" : ""}`}>
                      {isIn ? "Confirmed ✅" : p.status.replace("_", " ")}
                    </span>
                    {!isLocked && isIn && (
                      <button onClick={() => void replaceGuest(p.participantId)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: "0.75rem", fontFamily: "var(--font-display)", fontWeight: 600 }}>
                        Replace
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Guest participants */}
            {guests.filter((g) => g.status !== "REJECTED").map((g) => {
              const cfg = STATUS_CONFIG[g.status];
              return (
                <div key={g.id} className="list-row" style={{ background: cfg.bg, marginLeft: "-0.25rem", marginRight: "-0.25rem", padding: "0.9rem 0.25rem", borderRadius: "var(--radius-xs)" }}>
                  <div className="row">
                    <div className="avatar" style={{ background: cfg.bg }}>{g.display_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}</div>
                    <div>
                      <strong>{g.display_name}</strong>
                      {g.phone && <div className="faint" style={{ fontSize: "0.78rem" }}>{g.phone}</div>}
                      <div className="faint" style={{ fontSize: "0.72rem" }}>Via link</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
                    <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                    {!isLocked && g.status === "PENDING_PAYMENT" && (
                      <button onClick={() => void updateGuest(g.id, "REJECTED")}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: "0.75rem", fontFamily: "var(--font-display)", fontWeight: 600 }}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Pending section */}
        {pendingGuests.length > 0 && (
          <section className="panel" style={{ display: "grid", gap: "0.75rem", opacity: 0.8 }}>
            <p className="eyebrow">Awaiting payment ({pendingGuests.length})</p>
            <div className="list">
              {pendingGuests.map((g) => (
                <div key={g.id} className="list-row">
                  <span style={{ fontSize: "0.92rem" }}>{g.display_name}</span>
                  <div className="cluster" style={{ gap: "0.4rem" }}>
                    <Button size="sm" variant="ghost" onClick={() => void updateGuest(g.id, "CONFIRMED")}>
                      Confirm anyway
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void replaceGuest(g.id)}>
                      Replace
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Lock squad */}
        {isCaptain && !isLocked && (activeMatch.status === "PAYMENT_PENDING" || totalConfirmed >= activeMatch.squadSize) && (
          <section className="panel animate-in" style={{ display: "grid", gap: "0.75rem" }}>
            <p className="eyebrow">Ready to play?</p>
            <h3 className="title-md">Lock the squad</h3>
            <p className="muted" style={{ fontSize: "0.88rem" }}>
              Once locked, no new players can join. Only confirmed players will be in the final squad.
            </p>
            <Button onClick={() => void handleLock()} loading={locking} block>
              🔒 Lock Squad — {totalConfirmed} Players Confirmed
            </Button>
          </section>
        )}

        {msg && <p className={`message-strip${msg.error ? " error" : " success"}`}>{msg.text}</p>}

        {/* Strategy room link */}
        {isLocked && (
          <Link href={`/match/room?matchId=${params.matchId}`}>
            <Button variant="secondary" block>🧠 Open Strategy Room</Button>
          </Link>
        )}
      </div>
    </main>
  );
}
