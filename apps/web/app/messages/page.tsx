"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Loader } from "@/components/shared/Loader";
import { AuthPanel } from "@/components/shared/AuthPanel";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";
import type { MatchSummary } from "@korum/types/match";

type Message = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  users: { full_name: string; display_name: string } | null;
};

type ChatThread = {
  matchId: string;
  matchTitle: string;
  messages: Message[];
  loading: boolean;
  sending: boolean;
  draft: string;
  unread: number;
};

const timeStr = (iso: string) => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
};

const ini = (n: string) => (n ?? "?").split(" ").map(x => x[0]).join("").toUpperCase().slice(0, 2);

export default function MessagesPage() {
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { dashboardMatches, loadDashboard } = useMatch();

  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, ChatThread>>({});
  const [realtimeSub, setRealtimeSub] = useState<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || loadedRef.current) return;
    loadedRef.current = true;
    void loadDashboard();
  }, [isAuthenticated]);

  // Active matches only — these are where chat is relevant
  const chatMatches = dashboardMatches.filter(m =>
    ["RSVP_OPEN", "PAYMENT_PENDING", "LOCKED", "READY"].includes(m.status)
  );

  // Open a thread
  const openThread = async (m: MatchSummary) => {
    setActiveMatchId(m.id);
    if (threads[m.id]?.messages.length > 0) return; // already loaded

    setThreads(t => ({
      ...t,
      [m.id]: { matchId: m.id, matchTitle: m.title, messages: [], loading: true, sending: false, draft: "", unread: 0 },
    }));

    try {
      const res = await fetch(`/api/messages?matchId=${m.id}`, { credentials: "same-origin" });
      const data = await res.json() as { messages: Message[] };
      setThreads(t => ({
        ...t,
        [m.id]: { ...t[m.id]!, messages: data.messages ?? [], loading: false },
      }));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setThreads(t => ({ ...t, [m.id]: { ...t[m.id]!, loading: false } }));
    }

    // Subscribe to realtime new messages
    void subscribeToMatch(m.id);
  };

  const subscribeToMatch = async (matchId: string) => {
    const { getSupabaseBrowserClient } = await import("@/services/supabase/client");
    const client = getSupabaseBrowserClient();

    client
      .channel(`match_messages:${matchId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "match_messages",
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setThreads(t => {
          const thread = t[matchId];
          if (!thread) return t;
          // Avoid duplicates
          if (thread.messages.some(m => m.id === msg.id)) return t;
          return {
            ...t,
            [matchId]: {
              ...thread,
              messages: [...thread.messages, msg],
              unread: thread.matchId !== activeMatchId ? thread.unread + 1 : 0,
            },
          };
        });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      })
      .subscribe();
  };

  const sendMessage = async (matchId: string) => {
    const thread = threads[matchId];
    if (!thread || !thread.draft.trim() || thread.sending) return;

    const draft = thread.draft.trim();
    setThreads(t => ({ ...t, [matchId]: { ...t[matchId]!, draft: "", sending: true } }));

    // Optimistic insert
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      content: draft,
      created_at: new Date().toISOString(),
      author_id: profile?.id ?? "",
      users: { full_name: profile?.fullName ?? "", display_name: profile?.displayName ?? "" },
    };
    setThreads(t => ({ ...t, [matchId]: { ...t[matchId]!, messages: [...t[matchId]!.messages, optimistic] } }));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ matchId, content: draft }),
      });
    } finally {
      setThreads(t => ({ ...t, [matchId]: { ...t[matchId]!, sending: false } }));
    }
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <main>
        <div className="page">
          <AuthPanel title="Sign in to access messages" />
        </div>
      </main>
    );
  }

  if (authLoading) return <main><Loader label="Loading…" /></main>;

  const activeThread = activeMatchId ? threads[activeMatchId] : null;

  return (
    <main>
      <div style={{ display: "flex", height: "calc(100dvh - var(--header-h) - var(--tab-h))", overflow: "hidden" }}>

        {/* ── Thread list ── */}
        <div style={{
          width: activeMatchId ? 0 : "100%",
          minWidth: activeMatchId ? 0 : "100%",
          overflow: "hidden auto",
          borderRight: "1px solid var(--line)",
          transition: "all 200ms",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "16px 16px 8px" }}>
            <h1 className="t-h2">Messages</h1>
            <p className="t-caption" style={{ marginTop: 2, color: "var(--text-3)" }}>Match chat threads</p>
          </div>

          {chatMatches.length === 0 && (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
              <h3 className="t-title" style={{ marginBottom: 8 }}>No active matches</h3>
              <p className="t-body" style={{ color: "var(--text-3)", marginBottom: 20 }}>
                Match chat opens when you have an active match.
              </p>
              <Link href="/create/match">
                <button className="btn btn--primary">Create a Match</button>
              </Link>
            </div>
          )}

          {chatMatches.map(m => {
            const thread = threads[m.id];
            const last = thread?.messages[thread.messages.length - 1];
            const isLocked = m.status === "LOCKED" || m.status === "READY";
            return (
              <div
                key={m.id}
                onClick={() => void openThread(m)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px", cursor: "pointer",
                  borderBottom: "1px solid var(--line)",
                  background: activeMatchId === m.id ? "var(--blue-soft)" : "var(--surface)",
                  transition: "background 120ms",
                }}>
                <div style={{
                  width: 46, height: 46, borderRadius: "var(--r-md)", flexShrink: 0,
                  background: isLocked ? "var(--green-soft)" : "var(--blue-soft)",
                  border: `1.5px solid ${isLocked ? "var(--green-border)" : "var(--blue-border)"}`,
                  display: "grid", placeItems: "center", fontSize: 20,
                }}>
                  {isLocked ? "🔒" : "🏏"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.title}
                  </p>
                  <p className="t-caption" style={{ marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {last ? `${last.users?.display_name ?? "Someone"}: ${last.content}` : "Tap to open chat"}
                  </p>
                </div>
                {(thread?.unread ?? 0) > 0 && (
                  <div style={{ minWidth: 20, height: 20, borderRadius: "var(--r-full)", background: "var(--blue)", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, padding: "0 6px" }}>
                    {thread?.unread}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Chat view ── */}
        {activeMatchId && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "absolute", inset: 0, top: "var(--header-h)", bottom: "var(--tab-h)", background: "var(--bg)" }}>
            {/* Chat header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => setActiveMatchId(null)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 0", display: "flex", alignItems: "center", gap: 6, color: "var(--blue)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
                Back
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeThread?.matchTitle ?? "Chat"}
                </p>
                <p className="t-caption" style={{ marginTop: 1 }}>Match chat</p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {activeThread?.loading && <div style={{ textAlign: "center", padding: 32 }}><Loader label="Loading messages…" /></div>}

              {!activeThread?.loading && (activeThread?.messages.length ?? 0) === 0 && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                  <p className="t-title" style={{ marginBottom: 6 }}>No messages yet</p>
                  <p className="t-caption">Send the first message to your squad</p>
                </div>
              )}

              {activeThread?.messages.map((msg, i) => {
                const isMe = msg.author_id === profile?.id;
                const prevMsg = activeThread.messages[i - 1];
                const showName = !isMe && msg.author_id !== prevMsg?.author_id;
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: 2 }}>
                    {showName && (
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--text-3)", paddingLeft: 4 }}>
                        {msg.users?.display_name ?? msg.users?.full_name ?? "Player"}
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexDirection: isMe ? "row-reverse" : "row" }}>
                      {!isMe && (
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--blue-soft)", display: "grid", placeItems: "center", fontSize: 10, fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--blue)", flexShrink: 0 }}>
                          {ini(msg.users?.display_name ?? "?")}
                        </div>
                      )}
                      <div style={{
                        maxWidth: "72%", padding: "10px 14px", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        background: isMe ? "var(--blue)" : "var(--surface)",
                        color: isMe ? "#fff" : "var(--text)",
                        border: isMe ? "none" : "1px solid var(--line)",
                        boxShadow: "var(--shadow-1)",
                      }}>
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, wordBreak: "break-word" }}>{msg.content}</p>
                        <p style={{ margin: "4px 0 0", fontSize: 10, opacity: 0.6, textAlign: "right" }}>{timeStr(msg.created_at)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "10px 16px", borderTop: "1px solid var(--line)", background: "var(--surface)", display: "flex", gap: 10, alignItems: "flex-end" }}>
              <input
                ref={inputRef}
                value={threads[activeMatchId]?.draft ?? ""}
                onChange={e => setThreads(t => ({ ...t, [activeMatchId]: { ...t[activeMatchId]!, draft: e.target.value } }))}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(activeMatchId); } }}
                placeholder="Message your squad…"
                style={{ flex: 1, padding: "10px 14px", border: "1.5px solid var(--line)", borderRadius: "var(--r-full)", fontSize: 14, background: "var(--surface-2)", outline: "none", fontFamily: "inherit" }}
              />
              <button
                onClick={() => void sendMessage(activeMatchId)}
                disabled={!threads[activeMatchId]?.draft?.trim() || threads[activeMatchId]?.sending}
                style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "var(--blue)", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0, opacity: threads[activeMatchId]?.draft?.trim() ? 1 : 0.4, transition: "opacity 150ms" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
