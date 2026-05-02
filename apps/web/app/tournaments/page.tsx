"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/shared/Loader";
import { SPORT_OPTIONS } from "@/lib/constants";

type Tournament = {
  id: string; name: string; sport: string; format: string; status: string;
  city: string; venue_name: string | null; starts_on: string; ends_on: string | null;
  entry_fee: number; prize_pool: number; max_teams: number; min_teams: number;
  join_code: string; registeredTeams: number;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT:               { bg: "#f1f5f9", text: "#475569", label: "Draft" },
  REGISTRATION_OPEN:   { bg: "#dcfce7", text: "#166534", label: "Open" },
  REGISTRATION_CLOSED: { bg: "#fef3c7", text: "#92400e", label: "Reg. Closed" },
  ONGOING:             { bg: "#dbeafe", text: "#1e40af", label: "Ongoing" },
  COMPLETED:           { bg: "#f8fafc", text: "#64748b", label: "Completed" },
};

const FORMAT_LABELS: Record<string, string> = {
  LEAGUE: "League", KNOCKOUT: "Knockout", GROUP_KNOCKOUT: "Group + KO", ROUND_ROBIN: "Round Robin",
};

const fmtDate = (d: string) => {
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
};

export default function TournamentsPage() {
  const { isAuthenticated } = useAuth();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading]         = useState(true);
  const [sportFilter, setSportFilter] = useState("");
  const [cityFilter, setCityFilter]   = useState("");
  const [tab, setTab]                 = useState<"all" | "mine">("all");

  useEffect(() => { void load(); }, [tab, sportFilter, cityFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sportFilter) params.set("sport", sportFilter);
      if (cityFilter)  params.set("city", cityFilter);
      if (tab === "mine") params.set("my", "true");
      const res  = await fetch(`/api/tournaments?${params}`, { credentials: "same-origin" });
      const data = await res.json() as { tournaments: Tournament[] };
      setTournaments(data.tournaments ?? []);
    } finally { setLoading(false); }
  };

  return (
    <main>
      <div className="page">

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 className="t-h2">Tournaments</h1>
            <p className="t-caption" style={{ marginTop: 4 }}>Find tournaments to compete in or organise your own</p>
          </div>
          {isAuthenticated && (
            <Link href="/tournaments/create">
              <button style={{ padding: "10px 18px", border: "none", borderRadius: "var(--r-full)", background: "var(--blue)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                + Host
              </button>
            </Link>
          )}
        </div>

        {/* Tabs */}
        {isAuthenticated && (
          <div className="tab-bar">
            <button className={`tab ${tab === "all" ? "tab--active" : ""}`} onClick={() => setTab("all")}>All Tournaments</button>
            <button className={`tab ${tab === "mine" ? "tab--active" : ""}`} onClick={() => setTab("mine")}>My Tournaments</button>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 8 }}>
          <select className="select" value={sportFilter} onChange={e => setSportFilter(e.target.value)} style={{ flex: 1 }}>
            <option value="">All sports</option>
            {SPORT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="input" placeholder="City…" value={cityFilter} onChange={e => setCityFilter(e.target.value)} style={{ flex: 1 }} />
        </div>

        {loading ? (
          <Loader label="Loading tournaments…" />
        ) : tournaments.length === 0 ? (
          <div className="card card-pad" style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🏆</div>
            <h3 className="t-title" style={{ marginBottom: 8 }}>
              {tab === "mine" ? "No tournaments yet" : "No tournaments found"}
            </h3>
            <p className="t-body" style={{ color: "var(--text-3)", marginBottom: 20 }}>
              {tab === "mine" ? "Host your first tournament and start organising matches." : "Be the first to host a tournament in your city."}
            </p>
            {isAuthenticated && (
              <Link href="/tournaments/create">
                <button style={{ padding: "12px 24px", border: "none", borderRadius: "var(--r-full)", background: "var(--blue)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                  Host a Tournament
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tournaments.map(t => {
              const sc = STATUS_COLORS[t.status] ?? STATUS_COLORS.DRAFT;
              return (
                <Link key={t.id} href={`/tournaments/${t.id}`}>
                  <div className="card animate-in" style={{ overflow: "hidden", cursor: "pointer" }}>
                    <div style={{ height: 4, background: t.status === "REGISTRATION_OPEN" ? "var(--green)" : t.status === "ONGOING" ? "var(--blue)" : "var(--line)" }} />
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                        <div>
                          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16 }}>{t.name}</p>
                          <p className="t-caption" style={{ marginTop: 3 }}>📍 {t.city}{t.venue_name ? ` · ${t.venue_name}` : ""}</p>
                        </div>
                        <span style={{ padding: "3px 10px", borderRadius: "var(--r-full)", background: sc.bg, color: sc.text, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                          {sc.label}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                        <span className="badge">{t.sport}</span>
                        <span className="badge">{FORMAT_LABELS[t.format] ?? t.format}</span>
                        <span className="badge">{fmtDate(t.starts_on)}</span>
                      </div>

                      <div className="stats-strip">
                        <div className="stats-strip__item">
                          <span className="stats-strip__num">{t.registeredTeams}/{t.max_teams}</span>
                          <span className="stats-strip__label">Teams</span>
                        </div>
                        {t.entry_fee > 0 && (
                          <div className="stats-strip__item">
                            <span className="stats-strip__num" style={{ color: "var(--amber)" }}>₹{t.entry_fee}</span>
                            <span className="stats-strip__label">Entry</span>
                          </div>
                        )}
                        {t.prize_pool > 0 && (
                          <div className="stats-strip__item">
                            <span className="stats-strip__num" style={{ color: "var(--green)" }}>₹{t.prize_pool}</span>
                            <span className="stats-strip__label">Prize pool</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
