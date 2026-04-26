"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { useAuth } from "@/hooks/useAuth";
import { getMyTeams } from "@/services/api/team";
import type { TeamDetails } from "@korum/types/team";

// ── Types ────────────────────────────────────────────────────────────────────
type PendingItem = {
  id: string;
  check_id: string;
  response: string;
  availability_checks: {
    id: string;
    team_id: string;
    match_date: string;
    match_time: string | null;
    venue_hint: string | null;
    note: string | null;
    expires_at: string;
  };
};

type ProactiveEntry = {
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM or ""
  teamIds: string[];  // which teams to share with
  status: "AVAILABLE" | "UNAVAILABLE" | "MAYBE";
};

type Tab = "requests" | "my-availability";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d: string) => {
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }); }
  catch { return d; }
};
const fmtShort = (d: string) => {
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }); }
  catch { return d; }
};
const toLocalDate = (d: Date) => d.toISOString().slice(0, 10);
const today = toLocalDate(new Date());

// Generate next 14 days for the mini-calendar
const next14 = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return toLocalDate(d);
});

// ── Main component ────────────────────────────────────────────────────────────
export default function PlayerAvailabilityPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [tab, setTab]               = useState<Tab>("requests");
  const [pending, setPending]       = useState<PendingItem[]>([]);
  const [teams, setTeams]           = useState<TeamDetails[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);
  const [done, setDone]             = useState<Record<string, string>>({});

  // Proactive availability form
  const [selDate, setSelDate]       = useState(today);
  const [selTime, setSelTime]       = useState("");
  const [selTeams, setSelTeams]     = useState<string[]>([]); // empty = all teams
  const [selStatus, setSelStatus]   = useState<"AVAILABLE" | "UNAVAILABLE" | "MAYBE">("AVAILABLE");
  const [saving, setSaving]         = useState(false);
  const [myEntries, setMyEntries]   = useState<ProactiveEntry[]>([]);
  const [saveMsg, setSaveMsg]       = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    void load();
  }, [isAuthenticated]);

  const load = async () => {
    setLoadingData(true);
    try {
      const [avRes, teamRes] = await Promise.all([
        fetch("/api/availability-check", { credentials: "same-origin" }),
        getMyTeams(),
      ]);
      const avData = await avRes.json() as { pending: PendingItem[] };
      setPending(avData.pending ?? []);
      setTeams(teamRes.teams);
      // Default: share with all teams
      setSelTeams([]);
    } finally { setLoadingData(false); }
  };

  // ── Respond to captain's check ───────────────────────────────────────────
  const respond = async (checkId: string, response: string) => {
    setResponding(checkId + response);
    try {
      await fetch("/api/availability-check", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ checkId, response }),
      });
      setDone(d => ({ ...d, [checkId]: response }));
    } finally { setResponding(null); }
  };

  // ── Proactively mark availability ────────────────────────────────────────
  const saveAvailability = async () => {
    if (!selDate) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      // POST to availability-check as a player-initiated entry
      await fetch("/api/availability-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          playerInitiated: true,
          matchDate: selDate,
          matchTime: selTime || null,
          status: selStatus,
          teamIds: selTeams.length > 0 ? selTeams : null, // null = all teams
        }),
      });
      setMyEntries(e => [
        { date: selDate, time: selTime, teamIds: selTeams, status: selStatus },
        ...e.filter(x => x.date !== selDate),
      ]);
      setSaveMsg({ text: "Availability saved!", ok: true });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch {
      setSaveMsg({ text: "Could not save — try again", ok: false });
    } finally { setSaving(false); }
  };

  const toggleTeam = (id: string) =>
    setSelTeams(t => t.includes(id) ? t.filter(x => x !== id) : [...t, id]);

  // ── Auth gates ───────────────────────────────────────────────────────────
  if (!authLoading && !isAuthenticated) {
    return <main><div className="page"><AuthPanel title="Sign in to manage your availability" /></div></main>;
  }
  if (authLoading || loadingData) return <main><Loader label="Loading availability…" /></main>;

  const unanswered = pending.filter(p => !done[p.availability_checks.id]);
  const answered   = pending.filter(p =>  done[p.availability_checks.id]);

  const statusConfig = {
    AVAILABLE:   { label: "Available",    emoji: "✅", bg: "var(--green)",  soft: "var(--green-soft)",  border: "var(--green-border)",  text: "#166534" },
    MAYBE:       { label: "Maybe",        emoji: "🤔", bg: "var(--amber)",  soft: "var(--amber-soft)",  border: "var(--amber-border)",  text: "#92400e" },
    UNAVAILABLE: { label: "Unavailable",  emoji: "❌", bg: "var(--red)",    soft: "var(--red-soft)",    border: "var(--red-border)",    text: "#991b1b" },
  } as const;

  return (
    <main>
      <div className="page">

        {/* ── Header ── */}
        <div style={{ paddingTop: 4 }}>
          <h1 className="t-h2">Availability</h1>
          <p className="t-caption" style={{ marginTop: 4 }}>
            Respond to requests or proactively mark your schedule
          </p>
        </div>

        {/* ── Tab switcher ── */}
        <div className="tab-bar">
          <button className={`tab ${tab === "requests" ? "tab--active" : ""}`}
            onClick={() => setTab("requests")}>
            Requests {unanswered.length > 0 && (
              <span style={{ background: "var(--red)", color: "#fff", borderRadius: "var(--r-full)", padding: "0 6px", fontSize: 10, marginLeft: 4 }}>
                {unanswered.length}
              </span>
            )}
          </button>
          <button className={`tab ${tab === "my-availability" ? "tab--active" : ""}`}
            onClick={() => setTab("my-availability")}>
            My Availability
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1 — REQUESTS FROM CAPTAINS                                    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === "requests" && (
          <>
            {unanswered.length === 0 && answered.length === 0 && (
              <div className="card card-pad animate-in" style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                <h3 className="t-title" style={{ marginBottom: 6 }}>All caught up!</h3>
                <p className="t-body" style={{ color: "var(--text-3)" }}>
                  No pending requests from your captains.
                </p>
                <p className="t-caption" style={{ marginTop: 8 }}>
                  Switch to "My Availability" to proactively mark your schedule.
                </p>
              </div>
            )}

            {/* Unanswered — big actionable cards */}
            {unanswered.map(item => {
              const chk = item.availability_checks;
              const expired = new Date(chk.expires_at) < new Date();
              return (
                <div key={item.id} className="card animate-in" style={{ overflow: "hidden" }}>
                  {/* Top accent */}
                  <div style={{ height: 3, background: "var(--blue)" }} />
                  <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Date + venue */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17 }}>
                            {fmtDate(chk.match_date)}
                          </p>
                          {chk.match_time && (
                            <p className="t-caption" style={{ marginTop: 2 }}>🕐 {chk.match_time}</p>
                          )}
                          {chk.venue_hint && (
                            <p className="t-caption" style={{ marginTop: 2 }}>📍 {chk.venue_hint}</p>
                          )}
                        </div>
                        {expired && <span className="badge badge-red">Expired</span>}
                      </div>
                      {chk.note && (
                        <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--blue-soft)", borderRadius: "var(--r-sm)", border: "1px solid var(--blue-border)" }}>
                          <p style={{ margin: 0, fontSize: 13, color: "var(--blue)", fontStyle: "italic" }}>
                            &ldquo;{chk.note}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 3 big response buttons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(["AVAILABLE", "MAYBE", "UNAVAILABLE"] as const).map(val => {
                        const cfg = statusConfig[val];
                        const isActive = responding === chk.id + val;
                        return (
                          <button key={val}
                            disabled={!!responding || expired}
                            onClick={() => void respond(chk.id, val)}
                            style={{
                              width: "100%", minHeight: 52, border: `1.5px solid ${cfg.border}`,
                              borderRadius: "var(--r-lg)", cursor: expired ? "not-allowed" : "pointer",
                              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15,
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                              background: isActive ? cfg.bg : cfg.soft,
                              color: isActive ? "#fff" : cfg.text,
                              opacity: expired ? 0.45 : 1,
                              transition: "all 140ms",
                            }}>
                            <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
                            {isActive ? "Saving…" : cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Answered */}
            {answered.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p className="section-label">Responded</p>
                {answered.map(item => {
                  const chk = item.availability_checks;
                  const resp = done[chk.id];
                  const cfg = statusConfig[resp as keyof typeof statusConfig];
                  return (
                    <div key={item.id} className="card" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>
                          {fmtShort(chk.match_date)}
                        </p>
                        {chk.venue_hint && <p className="t-caption" style={{ marginTop: 2 }}>📍 {chk.venue_hint}</p>}
                      </div>
                      {cfg && (
                        <span style={{ padding: "4px 12px", borderRadius: "var(--r-full)", background: cfg.soft, border: `1px solid ${cfg.border}`, color: cfg.text, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12 }}>
                          {cfg.emoji} {cfg.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2 — MY AVAILABILITY (proactive)                               */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === "my-availability" && (
          <>
            {/* Explainer */}
            <div className="card card-pad" style={{ background: "var(--blue-soft)", borderColor: "var(--blue-border)" }}>
              <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--blue)" }}>
                Proactively mark your schedule
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#1e40af" }}>
                Captains see your availability when they check who can play. Choose which teams can see each entry.
              </p>
            </div>

            {/* Mini calendar — next 14 days */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p className="section-label">Select a date</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                {next14.map(d => {
                  const entry = myEntries.find(e => e.date === d);
                  const isSelected = selDate === d;
                  const isToday = d === today;
                  return (
                    <button key={d} onClick={() => setSelDate(d)}
                      style={{
                        padding: "8px 4px", border: "1.5px solid",
                        borderRadius: "var(--r-md)", cursor: "pointer",
                        fontFamily: "var(--font-display)", fontWeight: 700,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                        background: isSelected ? "var(--blue)" : entry ? statusConfig[entry.status].soft : "var(--surface)",
                        borderColor: isSelected ? "var(--blue)" : entry ? statusConfig[entry.status].border : "var(--line)",
                        color: isSelected ? "#fff" : "var(--text)",
                        transition: "all 120ms",
                      }}>
                      <span style={{ fontSize: 9, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })}
                      </span>
                      <span style={{ fontSize: 15, lineHeight: 1 }}>
                        {new Date(d + "T00:00:00").getDate()}
                      </span>
                      {isToday && <span style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "#fff" : "var(--blue)" }} />}
                      {entry && !isSelected && <span style={{ fontSize: 8 }}>{statusConfig[entry.status].emoji}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected date actions */}
            <div className="card card-pad animate-pop" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16 }}>
                {fmtDate(selDate)}
              </p>

              {/* Time (optional) */}
              <div className="field">
                <label className="field-label">Time (optional)</label>
                <input type="time" className="input" value={selTime}
                  onChange={e => setSelTime(e.target.value)}
                  style={{ fontFamily: "var(--font-display)", fontWeight: 700 }} />
              </div>

              {/* Status */}
              <div className="field">
                <label className="field-label">Your status</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(["AVAILABLE", "MAYBE", "UNAVAILABLE"] as const).map(val => {
                    const cfg = statusConfig[val];
                    return (
                      <button key={val}
                        onClick={() => setSelStatus(val)}
                        style={{
                          padding: "12px 16px", border: `1.5px solid ${selStatus === val ? cfg.bg : cfg.border}`,
                          borderRadius: "var(--r-lg)", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 12,
                          background: selStatus === val ? cfg.bg : cfg.soft,
                          color: selStatus === val ? "#fff" : cfg.text,
                          fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14,
                          transition: "all 120ms",
                        }}>
                        <span style={{ fontSize: 20 }}>{cfg.emoji}</span>
                        {cfg.label}
                        {selStatus === val && (
                          <span style={{ marginLeft: "auto", fontSize: 16 }}>✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Team selector */}
              {teams.length > 0 && (
                <div className="field">
                  <label className="field-label">Visible to</label>
                  {/* All teams option */}
                  <button
                    onClick={() => setSelTeams([])}
                    style={{
                      padding: "10px 14px", border: "1.5px solid",
                      borderRadius: "var(--r-md)", cursor: "pointer", marginBottom: 6,
                      display: "flex", alignItems: "center", gap: 10,
                      background: selTeams.length === 0 ? "var(--blue-soft)" : "var(--surface)",
                      borderColor: selTeams.length === 0 ? "var(--blue)" : "var(--line)",
                      color: selTeams.length === 0 ? "var(--blue)" : "var(--text)",
                      fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14,
                    }}>
                    <span style={{ fontSize: 18 }}>🏟️</span>
                    All my teams
                    {selTeams.length === 0 && <span style={{ marginLeft: "auto" }}>✓</span>}
                  </button>
                  {/* Individual teams */}
                  {teams.map(t => (
                    <button key={t.id}
                      onClick={() => toggleTeam(t.id)}
                      style={{
                        padding: "10px 14px", border: "1.5px solid", borderRadius: "var(--r-md)",
                        cursor: "pointer", marginBottom: 6, width: "100%",
                        display: "flex", alignItems: "center", gap: 10,
                        background: selTeams.includes(t.id) ? "var(--blue-soft)" : "var(--surface)",
                        borderColor: selTeams.includes(t.id) ? "var(--blue)" : "var(--line)",
                        color: selTeams.includes(t.id) ? "var(--blue)" : "var(--text)",
                        fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14,
                      }}>
                      <span style={{ fontSize: 18 }}>👥</span>
                      {t.name}
                      <span style={{ fontSize: 11, color: "var(--text-4)", fontWeight: 400, marginLeft: 4 }}>
                        {t.sport}
                      </span>
                      {selTeams.includes(t.id) && <span style={{ marginLeft: "auto" }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}

              {saveMsg && (
                <p style={{ margin: 0, padding: "10px 14px", borderRadius: "var(--r-md)", fontSize: 13, fontWeight: 600, background: saveMsg.ok ? "var(--green-soft)" : "var(--red-soft)", color: saveMsg.ok ? "#166534" : "#991b1b", border: `1px solid ${saveMsg.ok ? "var(--green-border)" : "var(--red-border)"}` }}>
                  {saveMsg.text}
                </p>
              )}

              <button
                onClick={() => void saveAvailability()}
                disabled={saving}
                style={{ width: "100%", minHeight: 52, border: "none", borderRadius: "var(--r-lg)", background: statusConfig[selStatus].bg, color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{statusConfig[selStatus].emoji}</span>
                {saving ? "Saving…" : `Mark as ${statusConfig[selStatus].label}`}
              </button>
            </div>

            {/* Already-set entries */}
            {myEntries.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p className="section-label">Your schedule (this session)</p>
                {myEntries.map((e, i) => {
                  const cfg = statusConfig[e.status];
                  return (
                    <div key={i} className="card" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>
                          {fmtShort(e.date)}{e.time ? ` · ${e.time}` : ""}
                        </p>
                        <p className="t-caption" style={{ marginTop: 2 }}>
                          {e.teamIds.length === 0 ? "All teams" : `${e.teamIds.length} team${e.teamIds.length > 1 ? "s" : ""}`}
                        </p>
                      </div>
                      <span style={{ padding: "4px 12px", borderRadius: "var(--r-full)", background: cfg.soft, border: `1px solid ${cfg.border}`, color: cfg.text, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12 }}>
                        {cfg.emoji} {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
