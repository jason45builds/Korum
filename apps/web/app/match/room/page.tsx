"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { MatchHeader } from "@/components/match/MatchHeader";
import { MatchStatus } from "@/components/match/MatchStatus";
import { PlayerList } from "@/components/match/PlayerList";
import { AuthPanel } from "@/components/shared/AuthPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";
import { buildMatchJoinLink, copyToClipboard } from "@/lib/helpers";

type StrategyNote = {
  id: string; content: string; is_pinned: boolean;
  author_id: string; created_at: string;
  users: { full_name: string; display_name: string } | null;
};

function MatchRoomContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("matchId");
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { activeMatch, loading, loadMatch } = useMatch(matchId);

  const [tab, setTab]         = useState<"squad" | "strategy">("squad");
  const [msg, setMsg]         = useState<{ text: string; error: boolean } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const [notes, setNotes]     = useState<StrategyNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [pinNote, setPinNote] = useState(false);
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
      notesLoaded.current = true; void loadNotes();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, matchId]);

  if (!matchId) return <main><EmptyState icon="🔗" title="Missing match ID" description="Open with ?matchId=" /></main>;
  if (loading && !activeMatch) return <main><Loader label="Loading room…" /></main>;
  if (!activeMatch) return <main><EmptyState icon="🏟️" title="Room unavailable" description="Match not found." /></main>;
  if (authLoading) return <main><div className="page-shell"><MatchHeader match={activeMatch} /><Loader label="Checking session…" /></div></main>;
  if (!isAuthenticated) return <main><div className="page-shell"><MatchHeader match={activeMatch} /><AuthPanel title="Sign in to access the room" /></div></main>;

  const isCaptain = activeMatch.captainId === profile?.id;
  const shareLink = buildMatchJoinLink(activeMatch.id, activeMatch.joinCode);
  const isLocked  = ["LOCKED","READY"].includes(activeMatch.status);

  const copyLink = async () => {
    await copyToClipboard(shareLink);
    setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000);
  };

  const postNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      const res  = await fetch("/api/strategy", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ matchId, content: noteText.trim(), isPinned: pinNote }),
      });
      const data = await res.json() as { note: StrategyNote };
      setNotes(n => [data.note, ...n]);
      setNoteText(""); setPinNote(false);
    } finally { setAddingNote(false); }
  };

  const togglePin = async (note: StrategyNote) => {
    // Issue #4: only captain or note author can pin/unpin
    if (!isCaptain && note.author_id !== profile?.id) return;
    const res  = await fetch("/api/strategy", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
      body: JSON.stringify({ noteId: note.id, isPinned: !note.is_pinned }),
    });
    const data = await res.json() as { note: StrategyNote };
    setNotes(n => n.map(x => x.id === note.id ? data.note : x));
  };

  const deleteNote = async (noteId: string) => {
    await fetch(`/api/strategy?noteId=${noteId}`, { method: "DELETE", credentials: "same-origin" });
    setNotes(n => n.filter(x => x.id !== noteId));
  };

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "0.6rem", border: "none",
    borderRadius: "calc(var(--radius-md) - 3px)", cursor: "pointer",
    fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.82rem",
    transition: "all 150ms",
    background: active ? "var(--surface)" : "transparent",
    color:      active ? "var(--primary)" : "var(--text-faint)",
    boxShadow:  active ? "var(--shadow-sm)" : "none",
  });

  return (
    <main>
      <div className="page-shell">
        <MatchHeader match={activeMatch} />
        <MatchStatus match={activeMatch} />

        {/* Captain shortcut to Control Panel */}
        {isCaptain && (
          <Link href={`/match/control?matchId=${matchId}`}>
            <button style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--blue-border)", borderRadius: "var(--r-md)", background: "var(--blue-soft)", color: "var(--blue)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>⚡ Open Captain Control Panel</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </Link>
        )}

        {/* Tabs — Squad + Strategy only. Manage belongs in Captain Panel (#12). */}
        <div style={{ display: "flex", gap: "0.3rem", padding: "0.3rem", background: "var(--surface-muted)", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
          <button style={TAB_STYLE(tab === "squad")}    onClick={() => setTab("squad")}>👥 Squad</button>
          <button style={TAB_STYLE(tab === "strategy")} onClick={() => setTab("strategy")}>🧠 Strategy</button>
        </div>

        {/* ── Squad tab ── */}
        {tab === "squad" && <PlayerList participants={activeMatch.participants} />}

        {/* ── Strategy tab ── */}
        {tab === "strategy" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            {!isLocked && (
              <div className="card card-pad" style={{ display: "flex", gap: 12, alignItems: "center", background: "var(--surface-2)" }}>
                <span style={{ fontSize: "1.2rem" }}>🔒</span>
                <p className="t-caption">Strategy board opens once the squad is locked.</p>
              </div>
            )}
            {isLocked && (
              <>
                <Card eyebrow="Strategy Board" title="Add a note">
                  <div className="form-grid">
                    <textarea className="textarea" placeholder="Formation, set pieces, key instructions…"
                      value={noteText} onChange={e => setNoteText(e.target.value)} style={{ minHeight: "90px" }} />
                    <div className="row-between">
                      <label className="row" style={{ gap: "0.5rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600 }}>
                        <input type="checkbox" checked={pinNote} onChange={e => setPinNote(e.target.checked)} style={{ width: "1rem", height: "1rem" }} />
                        📌 Pin this note
                      </label>
                      <Button onClick={() => void postNote()} loading={addingNote} size="sm">Post</Button>
                    </div>
                  </div>
                </Card>

                {notes.length > 0 && (
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    {notes.map(note => {
                      const canPin = isCaptain || note.author_id === profile?.id; // Issue #4
                      const canDelete = note.author_id === profile?.id;
                      return (
                        <div key={note.id} className="card card-pad" style={{ borderLeft: note.is_pinned ? "3px solid var(--primary)" : "3px solid transparent" }}>
                          <div className="row-between">
                            <div className="row" style={{ gap: "0.5rem" }}>
                              {note.is_pinned && <span style={{ fontSize: "0.9rem" }}>📌</span>}
                              <span className="t-caption">
                                {note.users?.display_name ?? note.users?.full_name ?? "Player"} ·{" "}
                                {new Date(note.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <div className="row" style={{ gap: "0.4rem" }}>
                              {canPin && (
                                <button onClick={() => void togglePin(note)} style={{ all: "unset", cursor: "pointer", fontSize: "0.75rem", color: "var(--text-faint)" }}>
                                  {note.is_pinned ? "Unpin" : "Pin"}
                                </button>
                              )}
                              {canDelete && (
                                <button onClick={() => void deleteNote(note.id)} style={{ all: "unset", cursor: "pointer", fontSize: "0.75rem", color: "var(--danger)" }}>
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                          <p style={{ margin: "8px 0 0", fontSize: "0.93rem", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{note.content}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
                {notes.length === 0 && (
                  <div className="card card-pad" style={{ textAlign: "center" }}>
                    <p className="t-caption">No strategy notes yet. Add the first one above.</p>
                  </div>
                )}
              </>
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
