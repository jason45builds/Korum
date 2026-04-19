"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { MatchHeader } from "@/components/match/MatchHeader";
import { MatchStatus } from "@/components/match/MatchStatus";
import { PlayerList } from "@/components/match/PlayerList";
import { AuthPanel } from "@/components/shared/AuthPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useInvite } from "@/hooks/useInvite";
import { useMatch } from "@/hooks/useMatch";
import { buildMatchJoinLink, copyToClipboard } from "@/lib/helpers";

type StrategyNote = {
  id: string;
  content: string;
  is_pinned: boolean;
  author_id: string;
  created_at: string;
  users: { full_name: string; display_name: string } | null;
};

function MatchRoomContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("matchId");
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { activeMatch, loading, loadMatch, lockMatch, updateMatch } = useMatch(matchId);
  const { sendInvite, loading: inviteLoading } = useInvite(matchId ?? undefined);

  const [tab, setTab]             = useState<"squad" | "strategy" | "invite">("squad");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteName, setInviteName]   = useState("");
  const [msg, setMsg]             = useState<{ text: string; error: boolean } | null>(null);
  const [linkCopied, setLinkCopied]   = useState(false);

  // Strategy state
  const [notes, setNotes]         = useState<StrategyNote[]>([]);
  const [noteText, setNoteText]   = useState("");
  const [pinNote, setPinNote]     = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const notesLoaded = useRef(false);

  const loadNotes = async () => {
    if (!matchId) return;
    const res  = await fetch(`/api/strategy?matchId=${matchId}`, { credentials: "same-origin" });
    const data = await res.json() as { notes: StrategyNote[] };
    setNotes(data.notes ?? []);
  };

  useEffect(() => {
    if (tab === "strategy" && matchId && !notesLoaded.current) {
      notesLoaded.current = true;
      void loadNotes();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, matchId]);

  if (!matchId) return <main><EmptyState icon="🔗" title="Missing match ID" description="Open with ?matchId=" /></main>;
  if (loading && !activeMatch) return <main><Loader label="Loading room…" /></main>;
  if (!activeMatch) return <main><EmptyState icon="🏟️" title="Room unavailable" description="Match not found." /></main>;
  if (authLoading) return <main><div className="page-shell"><MatchHeader match={activeMatch} /><Loader label="Checking session…" /></div></main>;
  if (!isAuthenticated) return <main><div className="page-shell"><MatchHeader match={activeMatch} /><AuthPanel title="Sign in to access the room" /></div></main>;

  const isCaptain   = activeMatch.captainId === profile?.id;
  const shareLink   = buildMatchJoinLink(activeMatch.id, activeMatch.joinCode);
  const isLocked    = ["LOCKED", "READY"].includes(activeMatch.status);

  const copyLink = async () => {
    await copyToClipboard(shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleInvite = async () => {
    if (!invitePhone.trim()) { setMsg({ text: "Enter a phone number.", error: true }); return; }
    try {
      const res = await sendInvite({ invitedPhone: invitePhone.trim(), invitedName: inviteName.trim() || null });
      await copyToClipboard(res.shareLink);
      setMsg({ text: "Invite link copied to clipboard!", error: false });
      setInvitePhone(""); setInviteName("");
      await loadMatch({ matchId });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Failed", error: true });
    }
  };

  const handleLock = async () => {
    try {
      await lockMatch(matchId);
      setMsg({ text: "Squad locked! 🔒", error: false });
      await loadMatch({ matchId });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Failed", error: true });
    }
  };

  const handleReady = async () => {
    try {
      await updateMatch({ matchId, nextState: "READY" });
      setMsg({ text: "Match is ready! ✅", error: false });
      await loadMatch({ matchId });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Failed", error: true });
    }
  };

  const postNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ matchId, content: noteText.trim(), isPinned: pinNote }),
      });
      const data = await res.json() as { note: StrategyNote };
      setNotes((n) => [data.note, ...n]);
      setNoteText(""); setPinNote(false);
    } finally {
      setAddingNote(false);
    }
  };

  const togglePin = async (note: StrategyNote) => {
    const res  = await fetch("/api/strategy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ noteId: note.id, isPinned: !note.is_pinned }),
    });
    const data = await res.json() as { note: StrategyNote };
    setNotes((n) => n.map((x) => x.id === note.id ? data.note : x));
  };

  const deleteNote = async (noteId: string) => {
    await fetch(`/api/strategy?noteId=${noteId}`, { method: "DELETE", credentials: "same-origin" });
    setNotes((n) => n.filter((x) => x.id !== noteId));
  };

  const TAB_STYLE = (active: boolean) => ({
    flex: 1,
    padding: "0.6rem",
    border: "none",
    borderRadius: "calc(var(--radius-md) - 3px)",
    cursor: "pointer",
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "0.82rem",
    transition: "all 150ms",
    background: active ? "var(--surface)" : "transparent",
    color:      active ? "var(--primary)" : "var(--text-faint)",
    boxShadow:  active ? "var(--shadow-sm)" : "none",
  } as React.CSSProperties);

  return (
    <main>
      <div className="page-shell">
        <MatchHeader match={activeMatch} />
        <MatchStatus match={activeMatch} />

        {/* Tab bar */}
        <div style={{
          display: "flex", gap: "0.3rem", padding: "0.3rem",
          background: "var(--surface-muted)", borderRadius: "var(--radius-md)",
          border: "1px solid var(--line)",
        }}>
          <button style={TAB_STYLE(tab === "squad")}    onClick={() => setTab("squad")}>👥 Squad</button>
          <button style={TAB_STYLE(tab === "strategy")} onClick={() => setTab("strategy")}>🧠 Strategy</button>
          {isCaptain && <button style={TAB_STYLE(tab === "invite")} onClick={() => setTab("invite")}>📣 Manage</button>}
        </div>

        {/* ── Squad tab ── */}
        {tab === "squad" && (
          <PlayerList participants={activeMatch.participants} />
        )}

        {/* ── Strategy tab ── */}
        {tab === "strategy" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            {!isLocked && (
              <div className="panel" style={{ padding: "1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <span style={{ fontSize: "1.2rem" }}>🔒</span>
                <p className="muted" style={{ fontSize: "0.88rem" }}>
                  Strategy board opens once the squad is locked.
                </p>
              </div>
            )}

            {isLocked && (
              <>
                {/* Add note */}
                <Card eyebrow="Strategy Board" title="Add a note">
                  <div className="form-grid">
                    <textarea className="textarea" placeholder="Formation, set pieces, key instructions…"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      style={{ minHeight: "90px" }}
                    />
                    <div className="row-between">
                      <label className="row" style={{ gap: "0.5rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600 }}>
                        <input type="checkbox" checked={pinNote} onChange={(e) => setPinNote(e.target.checked)}
                          style={{ width: "1rem", height: "1rem" }} />
                        📌 Pin this note
                      </label>
                      <Button onClick={() => void postNote()} loading={addingNote} size="sm">
                        Post
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Notes list */}
                {notes.length > 0 && (
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    {notes.map((note) => (
                      <div key={note.id} className="panel" style={{
                        display: "grid", gap: "0.6rem",
                        borderLeft: note.is_pinned ? "3px solid var(--primary)" : "3px solid transparent",
                      }}>
                        <div className="row-between">
                          <div className="row" style={{ gap: "0.5rem" }}>
                            {note.is_pinned && <span style={{ fontSize: "0.9rem" }}>📌</span>}
                            <span className="faint" style={{ fontSize: "0.78rem" }}>
                              {note.users?.display_name ?? note.users?.full_name ?? "Unknown"} ·{" "}
                              {new Date(note.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="row" style={{ gap: "0.4rem" }}>
                            <button onClick={() => void togglePin(note)} style={{ all: "unset", cursor: "pointer", fontSize: "0.75rem", color: "var(--text-faint)" }}>
                              {note.is_pinned ? "Unpin" : "Pin"}
                            </button>
                            {note.author_id === profile?.id && (
                              <button onClick={() => void deleteNote(note.id)} style={{ all: "unset", cursor: "pointer", fontSize: "0.75rem", color: "var(--danger)" }}>
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.93rem", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                          {note.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {notes.length === 0 && (
                  <div className="panel" style={{ textAlign: "center", padding: "2rem" }}>
                    <p className="muted">No strategy notes yet. Add the first one above.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Manage tab (captain only) ── */}
        {tab === "invite" && isCaptain && (
          <div style={{ display: "grid", gap: "1rem" }}>
            {/* Share link */}
            <Card eyebrow="Share" title="Match join link">
              <div style={{ padding: "0.75rem", borderRadius: "var(--radius-sm)", background: "var(--surface-muted)", fontSize: "0.8rem", color: "var(--text-muted)", wordBreak: "break-all", border: "1px solid var(--line)" }}>
                {shareLink}
              </div>
              <Button variant="secondary" size="sm" onClick={() => void copyLink()}>
                {linkCopied ? "✓ Copied!" : "Copy Link"}
              </Button>
            </Card>

            {/* Invite by phone */}
            <Card eyebrow="Invite" title="Invite a player directly">
              <div className="form-grid">
                <label className="label">
                  Phone number
                  <input className="input" type="tel" inputMode="tel" placeholder="+91 98765 43210"
                    value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} />
                </label>
                <label className="label">
                  Name <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(optional)</span>
                  <input className="input" placeholder="Arjun Sharma"
                    value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
                </label>
                <Button variant="secondary" onClick={() => void handleInvite()} loading={inviteLoading} block>
                  Send Invite & Copy Link
                </Button>
              </div>
            </Card>

            {/* Lifecycle actions */}
            {activeMatch.status === "PAYMENT_PENDING" && (
              <Card eyebrow="Squad" title="Lock the squad">
                <p className="muted" style={{ fontSize: "0.88rem" }}>
                  Freeze the paid players. No new players can join after locking.
                </p>
                <Button onClick={() => void handleLock()} block>🔒 Lock Paid Squad</Button>
              </Card>
            )}

            {activeMatch.status === "LOCKED" && (
              <Card eyebrow="Match" title="Mark as ready">
                <p className="muted" style={{ fontSize: "0.88rem" }}>
                  Signal to all players that the match is confirmed and ready to go.
                </p>
                <Button variant="secondary" onClick={() => void handleReady()} block>✅ Mark Match Ready</Button>
              </Card>
            )}

            {msg && (
              <p className={`message-strip${msg.error ? " error" : " success"}`} role={msg.error ? "alert" : "status"}>
                {msg.text}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function MatchRoomPage() {
  return (
    <Suspense fallback={<main><Loader label="Loading room…" /></main>}>
      <MatchRoomContent />
    </Suspense>
  );
}
