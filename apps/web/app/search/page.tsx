"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { AuthPanel } from "@/components/shared/AuthPanel";

type MatchResult = { id: string; title: string; venueName: string; startsAt: string; sport: string; squadSize: number; pricePerPlayer: number; status: string; joinCode: string };
type PlayerResult = { id: string; fullName: string; displayName: string; city: string; sport: string; reliabilityScore: number; role: string };
type Results = { matches: MatchResult[]; players: PlayerResult[] };

const fmt = (s: string) => {
  try { return new Date(s).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return s; }
};

export default function SearchPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [q, setQ]           = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState<"all" | "matches" | "players">("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (q.length < 2) { setResults(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void search(); }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, tab]);

  const search = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${tab}`, { credentials: "same-origin" });
      const data = await res.json() as Results;
      setResults(data);
    } finally { setLoading(false); }
  };

  if (!authLoading && !isAuthenticated) {
    return <main><div className="page"><AuthPanel title="Sign in to search" /></div></main>;
  }

  const totalResults = (results?.matches.length ?? 0) + (results?.players.length ?? 0);

  return (
    <main>
      <div className="page">
        {/* Search input */}
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search matches, players, venues…"
            style={{ width: "100%", padding: "14px 14px 14px 44px", border: "1.5px solid var(--line)", borderRadius: "var(--r-lg)", fontSize: 15, background: "var(--surface)", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
          />
          {q && (
            <button onClick={() => { setQ(""); setResults(null); }} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-4)" }}>×</button>
          )}
        </div>

        {/* Filter tabs */}
        {q.length >= 2 && (
          <div className="tab-bar">
            {(["all", "matches", "players"] as const).map(t => (
              <button key={t} className={`tab ${tab === t ? "tab--active" : ""}`} onClick={() => setTab(t)}>
                {t === "all" ? "All" : t === "matches" ? "🏏 Matches" : "👤 Players"}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ width: 28, height: 28, border: "3px solid var(--line)", borderTopColor: "var(--blue)", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
          </div>
        )}

        {/* Empty state */}
        {!loading && q.length < 2 && (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>🔍</div>
            <h2 className="t-h2" style={{ marginBottom: 8 }}>Search Korum</h2>
            <p className="t-body" style={{ color: "var(--text-3)" }}>
              Find public matches to join, or look up players for your squad.
            </p>
          </div>
        )}

        {!loading && q.length >= 2 && results && totalResults === 0 && (
          <div style={{ textAlign: "center", padding: "32px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
            <p className="t-title" style={{ marginBottom: 6 }}>No results for &ldquo;{q}&rdquo;</p>
            <p className="t-body" style={{ color: "var(--text-3)" }}>Try a different search term.</p>
          </div>
        )}

        {/* Match results */}
        {!loading && (results?.matches.length ?? 0) > 0 && (tab === "all" || tab === "matches") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p className="section-label">Open Matches</p>
            {results!.matches.map(m => (
              <Link key={m.id} href={`/match/${m.id}`}>
                <div className="card" style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "var(--blue-soft)", display: "grid", placeItems: "center", fontSize: 20, flexShrink: 0 }}>
                    🏏
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.title}
                    </p>
                    <p className="t-caption" style={{ marginTop: 2 }}>
                      📅 {fmt(m.startsAt)} {m.venueName ? `· 📍 ${m.venueName}` : ""}
                    </p>
                    <p className="t-caption" style={{ marginTop: 1 }}>
                      {m.sport} · {m.pricePerPlayer > 0 ? `₹${m.pricePerPlayer}` : "Free"} · {m.squadSize} players
                    </p>
                  </div>
                  <span className="badge badge-blue">Join</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Player results */}
        {!loading && (results?.players.length ?? 0) > 0 && (tab === "all" || tab === "players") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p className="section-label">Players</p>
            {results!.players.map(p => {
              const ini = (p.displayName ?? p.fullName ?? "?").split(" ").map((x: string) => x[0]).join("").toUpperCase().slice(0, 2);
              const score = p.reliabilityScore ?? 100;
              const scoreColor = score >= 80 ? "var(--green)" : score >= 60 ? "var(--amber)" : "var(--red)";
              return (
                <div key={p.id} className="card" style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--blue-soft)", border: "1.5px solid var(--blue-border)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--blue)", flexShrink: 0 }}>
                    {ini}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>
                      {p.displayName ?? p.fullName}
                    </p>
                    <p className="t-caption" style={{ marginTop: 2 }}>
                      {[p.sport, p.city].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 18, color: scoreColor }}>{score}</p>
                    <p style={{ margin: 0, fontSize: 10, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Reliability</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
