"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";
import { Loader } from "@/components/shared/Loader";

type VoteResult = { userId: string; name: string; avatar: string | null; count: number };
type MOTMData = { votes: VoteResult[]; myVote: string | null; totalVotes: number; winner: VoteResult | null };

const ini = (n: string) => (n ?? "?").split(" ").map(x => x[0]).join("").toUpperCase().slice(0, 2);

function MOTMContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("matchId") ?? "";
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { activeMatch, loading } = useMatch(matchId);

  const [motm, setMotm]       = useState<MOTMData | null>(null);
  const [voting, setVoting]   = useState<string | null>(null);
  const [voted, setVoted]     = useState(false);
  const [revealed, setRevealed] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/motm?matchId=${matchId}`, { credentials: "same-origin" });
    const d = await res.json() as MOTMData;
    setMotm(d);
    if (d.myVote) { setVoted(true); setRevealed(true); }
  };

  useEffect(() => { if (isAuthenticated && matchId) void load(); }, [isAuthenticated, matchId]);

  const castVote = async (nomineeId: string) => {
    if (voting) return;
    setVoting(nomineeId);
    try {
      await fetch("/api/motm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ matchId, nomineeId }),
      });
      await load();
      setVoted(true);
      setTimeout(() => setRevealed(true), 800);
    } finally { setVoting(null); }
  };

  if (authLoading || loading) return <Loader label="Loading…" />;
  if (!activeMatch) return <div style={{ padding: 32, textAlign: "center", color: "var(--text-3)" }}>Match not found.</div>;

  const squad = activeMatch.participants.filter(p => ["CONFIRMED","LOCKED"].includes(p.status));
  const myEntry = squad.find(p => p.userId === profile?.id);
  const canVote = !!myEntry;
  const winner = motm?.winner;
  const maxVotes = motm?.votes?.[0]?.count ?? 1;

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}>
      <style>{`
        @keyframes starPop { 0%{transform:scale(0) rotate(-20deg);opacity:0} 60%{transform:scale(1.2) rotate(5deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
        @keyframes resultSlide { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
        @keyframes barFill { from{width:0%} to{width:var(--target-w)} }
        @keyframes confetti { 0%{transform:translateY(-20px) rotate(0);opacity:1} 100%{transform:translateY(80px) rotate(360deg);opacity:0} }
        .vote-card { transition: transform 160ms, box-shadow 160ms, border-color 160ms; }
        .vote-card:active { transform: scale(0.96); }
        .vote-card.selected { border-color: #fbbf24 !important; background: rgba(251,191,36,0.12) !important; }
      `}</style>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* Header */}
        <div style={{ padding: "32px 0 24px", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 10, animation: "starPop 0.5s ease both" }}>⭐</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 28, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>
            Player of the Match
          </h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginTop: 8 }}>
            {activeMatch.title} · {motm?.totalVotes ?? 0} vote{(motm?.totalVotes ?? 0) !== 1 ? "s" : ""} cast
          </p>
        </div>

        {/* Winner reveal */}
        {revealed && winner && (
          <div style={{ animation: "resultSlide 0.5s ease both", marginBottom: 28 }}>
            <div style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.05))", border: "1.5px solid rgba(251,191,36,0.5)", borderRadius: 24, padding: "24px 20px", textAlign: "center" }}>
              <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                🏆 Leading
              </p>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(251,191,36,0.2)", border: "3px solid #fbbf24", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 22, color: "#fbbf24", margin: "0 auto 12px" }}>
                {winner.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={winner.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                ) : ini(winner.name)}
              </div>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 22, color: "#fff", margin: "0 0 4px" }}>
                {winner.name}
              </p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                {winner.count} of {motm?.totalVotes} votes
              </p>
            </div>
          </div>
        )}

        {/* Vote bar chart (after voting) */}
        {revealed && (motm?.votes?.length ?? 0) > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {motm?.votes.map((v) => {
              const pct = maxVotes > 0 ? (v.count / maxVotes) * 100 : 0;
              const isWinner = v.userId === winner?.userId;
              const isMyVote = v.userId === motm.myVote;
              return (
                <div key={v.userId} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 14px", border: `1.5px solid ${isWinner ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.08)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: isWinner ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.1)", display: "grid", placeItems: "center", fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 800, color: isWinner ? "#fbbf24" : "rgba(255,255,255,0.7)", flexShrink: 0 }}>
                        {v.avatar ? <img src={v.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : ini(v.name)}
                      </div>
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "#fff" }}>{v.name}</span>
                      {isMyVote && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(37,99,235,0.4)", color: "#93c5fd", fontWeight: 700 }}>Your vote</span>}
                    </div>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 16, color: isWinner ? "#fbbf24" : "rgba(255,255,255,0.6)" }}>{v.count}</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: isWinner ? "#fbbf24" : "rgba(255,255,255,0.25)", width: `${pct}%`, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Voting cards */}
        {!voted && canVote && (
          <>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14, textAlign: "center" }}>
              Who stood out?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {squad.filter(p => p.userId !== profile?.id).map(p => {
                const isVoting = voting === p.userId;
                return (
                  <button
                    key={p.participantId}
                    disabled={!!voting}
                    onClick={() => void castVote(p.userId)}
                    className={`vote-card${motm?.myVote === p.userId ? " selected" : ""}`}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 16, cursor: "pointer", opacity: voting && !isVoting ? 0.5 : 1 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "#fff", flexShrink: 0 }}>
                      {ini(p.fullName)}
                    </div>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#fff", flex: 1, textAlign: "left" }}>
                      {p.fullName}
                    </span>
                    {isVoting ? (
                      <div style={{ width: 22, height: 22, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
                    ) : (
                      <span style={{ fontSize: 22 }}>⭐</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Not a participant */}
        {!canVote && isAuthenticated && (
          <div style={{ textAlign: "center", padding: "32px 20px", background: "rgba(255,255,255,0.05)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)" }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Only match participants can vote.</p>
          </div>
        )}

        {voted && !revealed && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ width: 28, height: 28, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fbbf24", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Counting votes…</p>
          </div>
        )}

        {voted && revealed && (
          <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 20 }}>
            {motm?.myVote ? "You voted. You can change your vote anytime." : "Votes are live."}
          </p>
        )}
      </div>
    </div>
  );
}

export default function MOTMPage() {
  return (
    <>
      <style>{`.app-header,.bottom-nav{display:none!important}`}</style>
      <Suspense fallback={<Loader label="Loading…" />}>
        <MOTMContent />
      </Suspense>
    </>
  );
}
