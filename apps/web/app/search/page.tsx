"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { AuthPanel } from "@/components/shared/AuthPanel";

// ── Types ──────────────────────────────────────────────────────────────────
type MatchResult      = { id: string; title: string; venueName: string; startsAt: string; sport: string; squadSize: number; pricePerPlayer: number; status: string; joinCode: string };
type PlayerResult     = { id: string; fullName: string; displayName: string; city: string; sport: string; reliabilityScore: number; role: string };
type TeamResult       = { id: string; name: string; slug: string; sport: string; city: string; inviteCode: string; captainName: string; memberCount: number };
type GroundResult     = { id: string; name: string; city: string; state: string; surface: string; sport: string[]; pricePerHour: number; capacity: number; amenities: string[]; isVerified: boolean };
type VendorResult     = { id: string; name: string; category: string; city: string; description: string; sports: string[]; priceNote: string; isVerified: boolean; rating: number; reviewCount: number };
type TournamentResult = { id: string; name: string; sport: string; format: string; city: string; startsOn: string; endsOn: string; status: string; maxTeams: number; entryFee: number; prizePool: number };

type Results = {
  matches: MatchResult[];
  players: PlayerResult[];
  teams: TeamResult[];
  grounds: GroundResult[];
  vendors: VendorResult[];
  tournaments: TournamentResult[];
};

type Tab = "all" | "matches" | "players" | "teams" | "grounds" | "vendors" | "tournaments";

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtDate = (s: string) => {
  try { return new Date(s).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }); }
  catch { return s; }
};
const ini = (n: string) => (n ?? "?").split(" ").map((x: string) => x[0]).join("").toUpperCase().slice(0, 2);
const scoreColor = (s: number) => s >= 80 ? "var(--green)" : s >= 60 ? "var(--amber)" : "var(--red)";

const CATEGORY_EMOJI: Record<string, string> = {
  Kit: "👕", Equipment: "🏏", Food: "🍱", Photography: "📸",
  Physio: "🩺", Transport: "🚐", Other: "🛒",
};

const FORMAT_LABEL: Record<string, string> = {
  LEAGUE: "League", KNOCKOUT: "Knockout", GROUP_KNOCKOUT: "Group + KO",
  ROUND_ROBIN: "Round Robin", CUSTOM: "Custom",
};

// ── Reusable empty ─────────────────────────────────────────────────────────
function Empty({ label }: { label: string }) {
  return (
    <div style={{ textAlign: "center", padding: "28px 20px" }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>😕</div>
      <p className="t-title" style={{ marginBottom: 4 }}>No {label} found</p>
      <p className="t-caption">Try a different search term</p>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function SearchPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [q, setQ]           = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState<Tab>("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (q.length < 2) { setResults(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void doSearch(); }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, tab]);

  const doSearch = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${tab}`, { credentials: "same-origin" });
      const data = await res.json() as Results;
      setResults(data);
    } finally { setLoading(false); }
  };

  if (!authLoading && !isAuthenticated) {
    return <main><div className="page"><AuthPanel title="Sign in to search" /></div></main>;
  }

  const total = results
    ? (results.matches.length + results.players.length + results.teams.length +
       results.grounds.length + results.vendors.length + results.tournaments.length)
    : 0;

  const TABS: { key: Tab; label: string }[] = [
    { key: "all",         label: "All"        },
    { key: "matches",     label: "Matches"    },
    { key: "teams",       label: "Teams"      },
    { key: "players",     label: "Players"    },
    { key: "grounds",     label: "Grounds"    },
    { key: "vendors",     label: "Vendors"    },
    { key: "tournaments", label: "Tournaments"},
  ];

  const show = (t: Tab) => tab === "all" || tab === t;

  return (
    <main>
      <div className="page">

        {/* ── Search input ── */}
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search matches, teams, players, grounds, vendors…"
            style={{ width: "100%", padding: "14px 40px 14px 44px", border: "1.5px solid var(--line)", borderRadius: "var(--r-lg)", fontSize: 15, background: "var(--surface)", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
          />
          {q && (
            <button onClick={() => { setQ(""); setResults(null); }}
              style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-4)", lineHeight: 1 }}>
              ×
            </button>
          )}
        </div>

        {/* ── Tabs (scrollable) ── */}
        {q.length >= 2 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  padding: "7px 14px", border: "1.5px solid", borderRadius: "var(--r-full)",
                  fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12,
                  cursor: "pointer", whiteSpace: "nowrap", transition: "all 120ms",
                  background: tab === t.key ? "var(--blue)" : "var(--surface)",
                  borderColor: tab === t.key ? "var(--blue)" : "var(--line)",
                  color: tab === t.key ? "#fff" : "var(--text-3)",
                }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Spinner ── */}
        {loading && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ width: 28, height: 28, border: "3px solid var(--line)", borderTopColor: "var(--blue)", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && q.length < 2 && (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>🔍</div>
            <h2 className="t-h2" style={{ marginBottom: 8 }}>Discover on Korum</h2>
            <p className="t-body" style={{ color: "var(--text-3)", marginBottom: 20 }}>
              Find matches to join, teams to play for, grounds to book, vendors for your kit, and tournaments to compete in.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {["Cricket","Chennai","Sunday league","Box cricket","Football"].map(s => (
                <button key={s} onClick={() => setQ(s)}
                  style={{ padding: "6px 14px", border: "1px solid var(--line)", borderRadius: "var(--r-full)", background: "var(--surface-2)", cursor: "pointer", fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-display)", fontWeight: 600 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && q.length >= 2 && results && total === 0 && (
          <div style={{ textAlign: "center", padding: "32px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
            <p className="t-title" style={{ marginBottom: 6 }}>No results for &ldquo;{q}&rdquo;</p>
            <p className="t-body" style={{ color: "var(--text-3)" }}>Try a city name, sport, or team name.</p>
          </div>
        )}

        {/* ══ MATCHES ══════════════════════════════════════════════════════════ */}
        {!loading && show("matches") && (results?.matches.length ?? 0) > 0 && (
          <Section label="Open Matches">
            {results!.matches.map(m => (
              <Link key={m.id} href={`/match/${m.id}`}>
                <div className="card" style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "var(--blue-soft)", display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0 }}>🏏</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="title-sm" style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</p>
                    <p className="t-caption" style={{ marginTop: 3 }}>📅 {fmtDate(m.startsAt)}{m.venueName ? ` · 📍 ${m.venueName}` : ""}</p>
                    <p className="t-caption" style={{ marginTop: 1 }}>{m.sport} · {m.pricePerPlayer > 0 ? `₹${m.pricePerPlayer}` : "Free"} · {m.squadSize} players</p>
                  </div>
                  <span className="badge badge-blue">Join</span>
                </div>
              </Link>
            ))}
          </Section>
        )}
        {!loading && tab === "matches" && results?.matches.length === 0 && <Empty label="open matches" />}

        {/* ══ TEAMS ════════════════════════════════════════════════════════════ */}
        {!loading && show("teams") && (results?.teams.length ?? 0) > 0 && (
          <Section label="Teams">
            {results!.teams.map(t => (
              <Link key={t.id} href={`/team/${t.id}`}>
                <div className="card" style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--blue-soft)", border: "1.5px solid var(--blue-border)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, color: "var(--blue)", flexShrink: 0 }}>
                    {ini(t.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="title-sm" style={{ margin: 0 }}>{t.name}</p>
                    <p className="t-caption" style={{ marginTop: 3 }}>{t.sport} · {t.city}</p>
                    <p className="t-caption" style={{ marginTop: 1 }}>👤 {t.captainName} · {t.memberCount} members</p>
                  </div>
                  <span className="badge badge-blue">View</span>
                </div>
              </Link>
            ))}
          </Section>
        )}
        {!loading && tab === "teams" && results?.teams.length === 0 && <Empty label="teams" />}

        {/* ══ PLAYERS ══════════════════════════════════════════════════════════ */}
        {!loading && show("players") && (results?.players.length ?? 0) > 0 && (
          <Section label="Players">
            {results!.players.map(p => (
              <div key={p.id} className="card" style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--blue-soft)", border: "1.5px solid var(--blue-border)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--blue)", flexShrink: 0 }}>
                  {ini(p.displayName ?? p.fullName)}
                </div>
                <div style={{ flex: 1 }}>
                  <p className="title-sm" style={{ margin: 0 }}>{p.displayName ?? p.fullName}</p>
                  <p className="t-caption" style={{ marginTop: 3 }}>{[p.sport, p.city].filter(Boolean).join(" · ")}</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 18, color: scoreColor(p.reliabilityScore ?? 100) }}>{p.reliabilityScore ?? 100}</p>
                  <p style={{ margin: 0, fontSize: 9, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Reliability</p>
                </div>
              </div>
            ))}
          </Section>
        )}
        {!loading && tab === "players" && results?.players.length === 0 && <Empty label="players" />}

        {/* ══ GROUNDS ══════════════════════════════════════════════════════════ */}
        {!loading && show("grounds") && (results?.grounds.length ?? 0) > 0 && (
          <Section label="Grounds & Venues">
            {results!.grounds.map(g => (
              <Link key={g.id} href={`/marketplace/ground/${g.id}`}>
                <div className="card" style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "var(--green-soft)", border: "1.5px solid var(--green-border)", display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0 }}>🏟️</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <p className="title-sm" style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</p>
                      {g.isVerified && <span style={{ fontSize: 11, color: "var(--blue)" }}>✓</span>}
                    </div>
                    <p className="t-caption" style={{ marginTop: 3 }}>📍 {g.city}{g.state ? `, ${g.state}` : ""}{g.surface ? ` · ${g.surface}` : ""}</p>
                    <p className="t-caption" style={{ marginTop: 1 }}>
                      {g.pricePerHour ? `₹${g.pricePerHour}/hr` : "Price on request"}
                      {g.capacity ? ` · Cap. ${g.capacity}` : ""}
                    </p>
                  </div>
                  <span className="badge badge-green">Book</span>
                </div>
              </Link>
            ))}
          </Section>
        )}
        {!loading && tab === "grounds" && results?.grounds.length === 0 && <Empty label="grounds" />}

        {/* ══ VENDORS ══════════════════════════════════════════════════════════ */}
        {!loading && show("vendors") && (results?.vendors.length ?? 0) > 0 && (
          <Section label="Vendors & Suppliers">
            {results!.vendors.map(v => (
              <div key={v.id} className="card" style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "var(--amber-soft)", border: "1.5px solid var(--amber-border)", display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0 }}>
                  {CATEGORY_EMOJI[v.category] ?? "🛒"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <p className="title-sm" style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</p>
                    {v.isVerified && <span style={{ fontSize: 11, color: "var(--blue)" }}>✓</span>}
                  </div>
                  <p className="t-caption" style={{ marginTop: 3 }}>{v.category} · {v.city}</p>
                  {v.priceNote && <p className="t-caption" style={{ marginTop: 1 }}>{v.priceNote}</p>}
                </div>
                {v.rating > 0 && (
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--amber)" }}>★ {v.rating.toFixed(1)}</p>
                    <p style={{ margin: 0, fontSize: 10, color: "var(--text-4)" }}>{v.reviewCount} reviews</p>
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}
        {!loading && tab === "vendors" && results?.vendors.length === 0 && <Empty label="vendors" />}

        {/* ══ TOURNAMENTS ══════════════════════════════════════════════════════ */}
        {!loading && show("tournaments") && (results?.tournaments.length ?? 0) > 0 && (
          <Section label="Tournaments">
            {results!.tournaments.map(t => (
              <Link key={t.id} href={`/tournament/${t.id}`}>
                <div className="card" style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "var(--red-soft)", border: "1.5px solid var(--red-border)", display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0 }}>🏆</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="title-sm" style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</p>
                    <p className="t-caption" style={{ marginTop: 3 }}>
                      {t.sport} · {FORMAT_LABEL[t.format] ?? t.format} · {t.city}
                    </p>
                    <p className="t-caption" style={{ marginTop: 1 }}>
                      📅 {fmtDate(t.startsOn)}
                      {t.entryFee > 0 ? ` · ₹${t.entryFee} entry` : " · Free entry"}
                      {t.prizePool > 0 ? ` · ₹${t.prizePool} prize` : ""}
                    </p>
                  </div>
                  <span className={`badge ${t.status === "ONGOING" ? "badge-green" : "badge-blue"}`}>
                    {t.status === "ONGOING" ? "Live" : "Register"}
                  </span>
                </div>
              </Link>
            ))}
          </Section>
        )}
        {!loading && tab === "tournaments" && results?.tournaments.length === 0 && <Empty label="tournaments" />}

      </div>
    </main>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p className="section-label">{label}</p>
      {children}
    </div>
  );
}
