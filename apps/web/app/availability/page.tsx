"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { useAuth } from "@/hooks/useAuth";
import { getMyTeams } from "@/services/api/team";
import type { TeamDetails } from "@korum/types/team";

// ─── Types ────────────────────────────────────────────────────────────────────
type PlayerAv = {
  userId: string; displayName: string; role: string;
  reliabilityScore: number; status: string; matchTime: string | null;
};

type PendingCheck = {
  id: string; check_id: string; response: string;
  availability_checks: {
    id: string; team_id: string; match_date: string;
    match_time: string | null; venue_hint: string | null;
    note: string | null; expires_at: string;
  };
};

type DateCount = { date: string; available: number; maybe: number; unavailable: number; totalMembers: number };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toLocalDate = (d: Date) => d.toISOString().slice(0, 10);
const today       = toLocalDate(new Date());
const next14      = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() + i); return toLocalDate(d);
});

const fmtDate = (d: string) => {
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }); }
  catch { return d; }
};
const fmtShort = (d: string) => {
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }); }
  catch { return d; }
};
const fmtDayNum = (d: string) => { try { return new Date(d + "T00:00:00").getDate(); } catch { return ""; } };
const fmtWeekday = (d: string) => { try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" }); } catch { return ""; } };

const STATUS_CFG = {
  AVAILABLE:   { label: "Available",    emoji: "✅", bg: "var(--green)",   soft: "var(--green-soft)", border: "var(--green-border)", text: "#166534" },
  MAYBE:       { label: "Maybe",        emoji: "🤔", bg: "var(--amber)",   soft: "var(--amber-soft)", border: "var(--amber-border)", text: "#92400e" },
  UNAVAILABLE: { label: "Unavailable",  emoji: "❌", bg: "var(--red)",     soft: "var(--red-soft)",   border: "var(--red-border)",   text: "#991b1b" },
  NO_RESPONSE: { label: "No response",  emoji: "⏳", bg: "var(--text-4)",  soft: "var(--surface-2)",  border: "var(--line)",         text: "var(--text-3)" },
} as const;

const STATUS_KEYS = ["AVAILABLE", "MAYBE", "UNAVAILABLE"] as const;
type StatusKey = typeof STATUS_KEYS[number];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AvailabilityPage() {
  const { isAuthenticated, loading: authLoading, profile } = useAuth();

  const [teams,       setTeams]       = useState<TeamDetails[]>([]);
  const [captainTeams, setCaptainTeams] = useState<TeamDetails[]>([]);
  const [mode,        setMode]        = useState<"player" | "captain">("player");
  const [tab,         setTab]         = useState<"requests" | "my-schedule">("requests");
  const [loading,     setLoading]     = useState(false);

  // Player state
  const [pending,     setPending]     = useState<PendingCheck[]>([]);
  const [done,        setDone]        = useState<Record<string, string>>({});
  const [responding,  setResponding]  = useState<string | null>(null);
  const [selDate,     setSelDate]     = useState(today);
  const [selTime,     setSelTime]     = useState("");
  const [selTeams,    setSelTeams]    = useState<string[]>([]);
  const [selStatus,   setSelStatus]   = useState<StatusKey>("AVAILABLE");
  const [saving,      setSaving]      = useState(false);
  const [saveMsg,     setSaveMsg]     = useState<{ text: string; ok: boolean } | null>(null);
  const [myEntries,   setMyEntries]   = useState<Array<{ date: string; time: string; teamIds: string[]; status: StatusKey }>>([]);

  // Captain state
  const [capTeam,    setCapTeam]    = useState("");
  const [capDate,    setCapDate]    = useState(today);
  const [capAv,      setCapAv]      = useState<PlayerAv[]>([]);
  const [calendar,   setCalendar]   = useState<DateCount[]>([]);
  const [capLoading, setCapLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadInit();
  }, [isAuthenticated]);

  const loadInit = async () => {
    setLoading(true);
    try {
      const [avRes, teamRes] = await Promise.all([
        fetch("/api/availability-check", { credentials: "same-origin" }),
        getMyTeams(),
      ]);
      const avData = await avRes.json() as { pending: PendingCheck[] };
      setPending(avData.pending ?? []);
      setTeams(teamRes.teams);

      // Determine captain teams
      const caps = teamRes.teams.filter(t =>
        t.members?.some(m => m.userId === profile?.id && ["CAPTAIN", "ADMIN"].includes(m.role))
      );
      setCaptainTeams(caps);
      if (caps.length > 0) setCapTeam(caps[0].id);
    } finally { setLoading(false); }
  };

  // Captain: load calendar heat-map when team changes
  useEffect(() => {
    if (!capTeam || mode !== "captain") return;
    void loadCapCalendar();
  }, [capTeam, mode]);

  // Captain: load detail when date changes
  useEffect(() => {
    if (!capTeam || mode !== "captain") return;
    void loadCapDetail();
  }, [capTeam, capDate, mode]);

  const loadCapCalendar = async () => {
    const start = today;
    const end   = next14[next14.length - 1];
    try {
      const res  = await fetch("/api/team/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ teamId: capTeam, startDate: start, endDate: end }),
      });
      const data = await res.json() as { calendar: DateCount[] };
      setCalendar(data.calendar ?? []);
    } catch { /* ignore */ }
  };

  const loadCapDetail = async () => {
    setCapLoading(true);
    try {
      const res  = await fetch(`/api/team/availability?teamId=${capTeam}&date=${capDate}`, { credentials: "same-origin" });
      const data = await res.json() as { availability: PlayerAv[] };
      setCapAv(data.availability ?? []);
    } finally { setCapLoading(false); }
  };

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

  const saveAvailability = async () => {
    if (!selDate) return;
    setSaving(true); setSaveMsg(null);
    try {
      await fetch("/api/availability-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          playerInitiated: true,
          matchDate: selDate,
          matchTime: selTime || null,
          status: selStatus,
          teamIds: selTeams.length > 0 ? selTeams : null,
        }),
      });
      setMyEntries(e => [
        { date: selDate, time: selTime, teamIds: selTeams, status: selStatus },
        ...e.filter(x => x.date !== selDate),
      ]);
      setSaveMsg({ text: "Saved! Your captain can now see your availability.", ok: true });
      setTimeout(() => setSaveMsg(null), 3500);
    } catch {
      setSaveMsg({ text: "Could not save — try again", ok: false });
    } finally { setSaving(false); }
  };

  const toggleTeam = (id: string) =>
    setSelTeams(t => t.includes(id) ? t.filter(x => x !== id) : [...t, id]);

  // Auth guards — show content immediately, don't block on loading
  if (!isAuthenticated) {
    return <main><div className="page"><AuthPanel title="Sign in to manage your availability" /></div></main>;
  }
  if (loading) return <main><Loader label="Loading availability…" /></main>;

  const unanswered  = pending.filter(p => !done[p.availability_checks.id]);
  const dateCountMap = new Map(calendar.map(c => [c.date, c]));

  // ── CAPTAIN MODE ─────────────────────────────────────────────────────────
  const renderCaptainView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Team selector */}
      {captainTeams.length > 1 && (
        <select className="select" value={capTeam} onChange={e => setCapTeam(e.target.value)}>
          {captainTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}

      {/* Calendar heat-map */}
      <div>
        <p className="section-label" style={{ marginBottom: 8 }}>Select a date to see who&apos;s available</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
          {next14.map(d => {
            const cnt       = dateCountMap.get(d);
            const total     = cnt?.totalMembers ?? 0;
            const available = cnt?.available ?? 0;
            const maybe     = cnt?.maybe ?? 0;
            const pct       = total > 0 ? (available / total) : 0;
            const isSelected = capDate === d;
            const isToday    = d === today;

            let bg    = "var(--surface-2)";
            let border = "var(--line)";
            if (available > 0 && pct >= 0.5)   { bg = "var(--green-soft)"; border = "var(--green-border)"; }
            else if (available > 0)             { bg = "var(--amber-soft)"; border = "var(--amber-border)"; }
            if (isSelected) { bg = "var(--blue)"; border = "var(--blue)"; }

            return (
              <button key={d} onClick={() => setCapDate(d)}
                style={{ padding: "8px 4px", border: "1.5px solid", borderColor: border, borderRadius: "var(--r-md)", cursor: "pointer", background: bg, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, transition: "all 120ms" }}>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: isSelected ? "#fff" : "var(--text-4)" }}>{fmtWeekday(d)}</span>
                <span style={{ fontSize: 15, fontFamily: "var(--font-display)", fontWeight: 900, color: isSelected ? "#fff" : "var(--text)" }}>{fmtDayNum(d)}</span>
                {isToday && <span style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "#fff" : "var(--blue)" }} />}
                {available > 0 && !isSelected && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: pct >= 0.5 ? "#166534" : "#92400e" }}>{available}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail for selected date */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>
            {fmtDate(capDate)}
          </p>
          {capAv.length > 0 && (
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#166534" }}>
                ✅ {capAv.filter(p => p.status === "AVAILABLE").length}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>
                🤔 {capAv.filter(p => p.status === "MAYBE").length}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-4)" }}>
                ⏳ {capAv.filter(p => p.status === "NO_RESPONSE").length}
              </span>
            </div>
          )}
        </div>

        {capLoading ? (
          <div style={{ padding: 24, textAlign: "center" }}><Loader label="Loading…" /></div>
        ) : capAv.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center" }}>
            <p className="t-caption">No members have marked availability for this date yet.</p>
          </div>
        ) : (
          capAv.map(p => {
            const cfg = STATUS_CFG[p.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.NO_RESPONSE;
            return (
              <div key={p.userId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
                {/* Avatar */}
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: cfg.soft, border: `1.5px solid ${cfg.border}`, display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: cfg.text, flexShrink: 0 }}>
                  {p.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{p.displayName}</p>
                  {p.matchTime && <p className="t-caption" style={{ marginTop: 2 }}>🕐 {p.matchTime}</p>}
                </div>
                <span style={{ padding: "3px 10px", borderRadius: "var(--r-full)", background: cfg.soft, border: `1px solid ${cfg.border}`, color: cfg.text, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                  {cfg.emoji} {cfg.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // ── PLAYER MODE ───────────────────────────────────────────────────────────
  const renderPlayerView = () => (
    <>
      <div className="tab-bar">
        <button className={`tab ${tab === "requests" ? "tab--active" : ""}`} onClick={() => setTab("requests")}>
          Requests {unanswered.length > 0 && (
            <span style={{ background: "var(--red)", color: "#fff", borderRadius: "var(--r-full)", padding: "0 6px", fontSize: 10, marginLeft: 4 }}>
              {unanswered.length}
            </span>
          )}
        </button>
        <button className={`tab ${tab === "my-schedule" ? "tab--active" : ""}`} onClick={() => setTab("my-schedule")}>
          My Schedule
        </button>
      </div>

      {/* Requests */}
      {tab === "requests" && (
        <>
          {unanswered.length === 0 && (
            <div className="card card-pad" style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <h3 className="t-title" style={{ marginBottom: 6 }}>All caught up!</h3>
              <p className="t-body" style={{ color: "var(--text-3)" }}>No pending requests from your captains.</p>
              <p className="t-caption" style={{ marginTop: 8 }}>
                Switch to &ldquo;My Schedule&rdquo; to proactively mark when you&apos;re free.
              </p>
            </div>
          )}

          {unanswered.map(item => {
            const chk     = item.availability_checks;
            const expired = new Date(chk.expires_at) < new Date();
            return (
              <div key={item.id} className="card animate-in" style={{ overflow: "hidden" }}>
                <div style={{ height: 3, background: "var(--blue)" }} />
                <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17 }}>
                      {fmtDate(chk.match_date)}
                    </p>
                    {chk.match_time && <p className="t-caption" style={{ marginTop: 2 }}>🕐 {chk.match_time}</p>}
                    {chk.venue_hint && <p className="t-caption" style={{ marginTop: 2 }}>📍 {chk.venue_hint}</p>}
                    {chk.note && (
                      <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--blue-soft)", borderRadius: "var(--r-sm)", border: "1px solid var(--blue-border)" }}>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--blue)", fontStyle: "italic" }}>
                          &ldquo;{chk.note}&rdquo;
                        </p>
                      </div>
                    )}
                    {expired && <span className="badge badge-red" style={{ marginTop: 8, display: "inline-block" }}>Expired</span>}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {STATUS_KEYS.map(val => {
                      const cfg    = STATUS_CFG[val];
                      const isAct  = responding === chk.id + val;
                      return (
                        <button key={val} disabled={!!responding || expired}
                          onClick={() => void respond(chk.id, val)}
                          style={{ width: "100%", minHeight: 52, border: `1.5px solid ${cfg.border}`, borderRadius: "var(--r-lg)", cursor: expired ? "not-allowed" : "pointer", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: isAct ? cfg.bg : cfg.soft, color: isAct ? "#fff" : cfg.text, opacity: expired ? 0.45 : 1, transition: "all 140ms" }}>
                          <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
                          {isAct ? "Saving…" : cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* My Schedule */}
      {tab === "my-schedule" && (
        <>
          <div style={{ padding: "12px 14px", background: "var(--blue-soft)", border: "1px solid var(--blue-border)", borderRadius: "var(--r-md)" }}>
            <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--blue)" }}>
              Mark your availability proactively
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#1e40af" }}>
              Your captain sees this when planning matches. Be specific — it helps them pick the right day.
            </p>
          </div>

          {/* Date picker */}
          <div>
            <p className="section-label" style={{ marginBottom: 8 }}>Pick a date</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
              {next14.map(d => {
                const entry     = myEntries.find(e => e.date === d);
                const isSelected = selDate === d;
                const isToday   = d === today;
                const cfg       = entry ? STATUS_CFG[entry.status] : null;
                return (
                  <button key={d} onClick={() => setSelDate(d)}
                    style={{ padding: "8px 4px", border: "1.5px solid", borderRadius: "var(--r-md)", cursor: "pointer", fontFamily: "var(--font-display)", fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: isSelected ? "var(--blue)" : cfg ? cfg.soft : "var(--surface)", borderColor: isSelected ? "var(--blue)" : cfg ? cfg.border : "var(--line)", color: isSelected ? "#fff" : "var(--text)", transition: "all 120ms" }}>
                    <span style={{ fontSize: 9, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.05em" }}>{fmtWeekday(d)}</span>
                    <span style={{ fontSize: 15, lineHeight: 1 }}>{fmtDayNum(d)}</span>
                    {isToday && <span style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "#fff" : "var(--blue)" }} />}
                    {cfg && !isSelected && <span style={{ fontSize: 8 }}>{cfg.emoji}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mark form */}
          <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16 }}>
              {fmtDate(selDate)}
            </p>

            {/* Status buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {STATUS_KEYS.map(val => {
                const cfg = STATUS_CFG[val];
                return (
                  <button key={val} onClick={() => setSelStatus(val)}
                    style={{ padding: "12px 16px", border: `1.5px solid ${selStatus === val ? cfg.bg : cfg.border}`, borderRadius: "var(--r-lg)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, background: selStatus === val ? cfg.bg : cfg.soft, color: selStatus === val ? "#fff" : cfg.text, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, transition: "all 120ms" }}>
                    <span style={{ fontSize: 20 }}>{cfg.emoji}</span>
                    {cfg.label}
                    {selStatus === val && <span style={{ marginLeft: "auto" }}>✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Time */}
            <div className="field">
              <label className="field-label">Time (optional)</label>
              <input type="time" className="input" value={selTime} onChange={e => setSelTime(e.target.value)} />
            </div>

            {/* Visibility */}
            {teams.length > 0 && (
              <div className="field">
                <label className="field-label">Visible to</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button onClick={() => setSelTeams([])}
                    style={{ padding: "10px 14px", border: "1.5px solid", borderRadius: "var(--r-md)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: selTeams.length === 0 ? "var(--blue-soft)" : "var(--surface)", borderColor: selTeams.length === 0 ? "var(--blue)" : "var(--line)", color: selTeams.length === 0 ? "var(--blue)" : "var(--text)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>
                    🏟️ All my teams {selTeams.length === 0 && "✓"}
                  </button>
                  {teams.map(t => (
                    <button key={t.id} onClick={() => toggleTeam(t.id)}
                      style={{ padding: "10px 14px", border: "1.5px solid", borderRadius: "var(--r-md)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: selTeams.includes(t.id) ? "var(--blue-soft)" : "var(--surface)", borderColor: selTeams.includes(t.id) ? "var(--blue)" : "var(--line)", color: selTeams.includes(t.id) ? "var(--blue)" : "var(--text)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>
                      👥 {t.name} {selTeams.includes(t.id) && "✓"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {saveMsg && (
              <p style={{ margin: 0, padding: "10px 14px", borderRadius: "var(--r-md)", fontSize: 13, fontWeight: 600, background: saveMsg.ok ? "var(--green-soft)" : "var(--red-soft)", color: saveMsg.ok ? "#166534" : "#991b1b" }}>
                {saveMsg.text}
              </p>
            )}

            <button onClick={() => void saveAvailability()} disabled={saving}
              style={{ width: "100%", minHeight: 52, border: "none", borderRadius: "var(--r-lg)", background: STATUS_CFG[selStatus].bg, color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{STATUS_CFG[selStatus].emoji}</span>
              {saving ? "Saving…" : `Mark as ${STATUS_CFG[selStatus].label}`}
            </button>
          </div>

          {/* Session entries */}
          {myEntries.length > 0 && (
            <div>
              <p className="section-label" style={{ marginBottom: 8 }}>Marked this session</p>
              {myEntries.map((e, i) => {
                const cfg = STATUS_CFG[e.status];
                return (
                  <div key={i} className="card" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
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
    </>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <main>
      <div className="page">

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 className="t-h2">Availability</h1>
            <p className="t-caption" style={{ marginTop: 4 }}>
              {mode === "captain" ? "See who from your team is available" : "Respond to requests or mark your schedule"}
            </p>
          </div>
          {captainTeams.length > 0 && (
            <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: "var(--r-full)", padding: 3, gap: 2, border: "1px solid var(--line)" }}>
              <button onClick={() => setMode("player")}
                style={{ padding: "6px 14px", borderRadius: "var(--r-full)", border: "none", background: mode === "player" ? "#fff" : "transparent", color: mode === "player" ? "var(--blue)" : "var(--text-3)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, cursor: "pointer", boxShadow: mode === "player" ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 140ms" }}>
                Player
              </button>
              <button onClick={() => setMode("captain")}
                style={{ padding: "6px 14px", borderRadius: "var(--r-full)", border: "none", background: mode === "captain" ? "#fff" : "transparent", color: mode === "captain" ? "var(--blue)" : "var(--text-3)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, cursor: "pointer", boxShadow: mode === "captain" ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 140ms" }}>
                Captain
              </button>
            </div>
          )}
        </div>

        {mode === "captain" ? renderCaptainView() : renderPlayerView()}
      </div>
    </main>
  );
}
