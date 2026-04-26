"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Loader } from "@/components/shared/Loader";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";

function AttendanceContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const matchId      = searchParams.get("matchId") ?? "";
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { activeMatch, loading } = useMatch(matchId);

  const [attended, setAttended]   = useState<Set<string>>(new Set());
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [err, setErr]             = useState<string | null>(null);

  // Pre-select everyone as attended by default
  useEffect(() => {
    if (!activeMatch) return;
    const confirmed = activeMatch.participants
      .filter(p => ["CONFIRMED", "LOCKED"].includes(p.status))
      .map(p => p.userId);
    setAttended(new Set(confirmed));
  }, [activeMatch?.id]);

  if (authLoading || (loading && !activeMatch)) return <main><Loader label="Loading…" /></main>;
  if (!isAuthenticated) return <main><div className="page"><p>Sign in to record attendance.</p></div></main>;
  if (!activeMatch) return <main><div className="page"><p>Match not found.</p></div></main>;

  const isCaptain = activeMatch.captainId === profile?.id;
  if (!isCaptain) return <main><div className="page"><p>Only the captain can record attendance.</p></div></main>;

  const squad = activeMatch.participants.filter(p => ["CONFIRMED", "LOCKED"].includes(p.status));

  const toggle = (userId: string) => {
    setAttended(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ matchId, attendeeIds: [...attended] }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed");
      }
      setSaved(true);
      setTimeout(() => router.push(`/match/control?matchId=${matchId}`), 1800);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const ini = (n: string) => n.split(" ").map(x => x[0]).join("").toUpperCase().slice(0, 2);

  if (saved) {
    return (
      <main>
        <div className="page" style={{ textAlign: "center", paddingTop: 64 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
          <h2 className="t-h2" style={{ marginBottom: 8 }}>Attendance saved!</h2>
          <p className="t-body" style={{ color: "var(--text-3)" }}>
            Reliability scores updated. Returning to control panel…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="page">
        {/* Header */}
        <div>
          <p className="t-caption" style={{ color: "var(--blue)" }}>Post-match</p>
          <h1 className="t-h2" style={{ marginBottom: 4 }}>Record Attendance</h1>
          <p className="t-body" style={{ color: "var(--text-3)" }}>
            {activeMatch.title} · Tap to mark who showed up
          </p>
        </div>

        {/* Summary strip */}
        <div className="stats-strip">
          <div className="stats-strip__item">
            <span className="stats-strip__num" style={{ color: "var(--green)" }}>{attended.size}</span>
            <span className="stats-strip__label">Attended</span>
          </div>
          <div className="stats-strip__item">
            <span className="stats-strip__num" style={{ color: "var(--red)" }}>{squad.length - attended.size}</span>
            <span className="stats-strip__label">No-show</span>
          </div>
          <div className="stats-strip__item">
            <span className="stats-strip__num">{squad.length}</span>
            <span className="stats-strip__label">Squad</span>
          </div>
        </div>

        {/* Explainer */}
        <div className="card" style={{ padding: "12px 16px", background: "var(--blue-soft)", border: "1px solid var(--blue-border)" }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--blue)", lineHeight: 1.5 }}>
            <strong>How this works:</strong> Players who attended get +2 reliability. No-shows lose 15 points. This builds trust across the platform.
          </p>
        </div>

        {/* Bulk actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setAttended(new Set(squad.map(p => p.userId)))}
            style={{ flex: 1, padding: "10px", border: "1.5px solid var(--green-border)", borderRadius: "var(--r-md)", background: "var(--green-soft)", color: "#166534", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            ✅ All Attended
          </button>
          <button
            onClick={() => setAttended(new Set())}
            style={{ flex: 1, padding: "10px", border: "1.5px solid var(--red-border)", borderRadius: "var(--r-md)", background: "var(--red-soft)", color: "#991b1b", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            ❌ All No-show
          </button>
        </div>

        {/* Player list */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>
            <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Confirmed squad ({squad.length})
            </p>
          </div>
          {squad.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center" }}>
              <p className="t-body" style={{ color: "var(--text-3)" }}>No confirmed players to mark.</p>
            </div>
          )}
          {squad.map((p, i) => {
            const isIn = attended.has(p.userId);
            return (
              <div
                key={p.participantId}
                onClick={() => toggle(p.userId)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", cursor: "pointer",
                  borderBottom: i < squad.length - 1 ? "1px solid var(--line)" : "none",
                  background: isIn ? "var(--green-soft)" : "var(--red-soft)",
                  transition: "background 120ms",
                }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  display: "grid", placeItems: "center",
                  fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14,
                  background: isIn ? "var(--green)" : "var(--red)",
                  color: "#fff",
                }}>
                  {ini(p.fullName)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>
                    {p.fullName}
                  </p>
                  {p.reliabilityScore > 0 && (
                    <p className="t-caption" style={{ marginTop: 2, color: p.reliabilityScore >= 80 ? "var(--green)" : p.reliabilityScore >= 60 ? "var(--amber)" : "var(--red)" }}>
                      Reliability: {p.reliabilityScore}
                    </p>
                  )}
                </div>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  display: "grid", placeItems: "center",
                  background: isIn ? "var(--green)" : "var(--red)",
                  fontSize: 16,
                }}>
                  {isIn ? "✅" : "❌"}
                </div>
              </div>
            );
          })}
        </div>

        {err && (
          <div style={{ padding: "12px 16px", background: "var(--red-soft)", border: "1px solid var(--red-border)", borderRadius: "var(--r-md)" }}>
            <p style={{ margin: 0, color: "var(--red)", fontSize: 14, fontWeight: 600 }}>{err}</p>
          </div>
        )}

        <button
          disabled={saving}
          onClick={() => void handleSave()}
          style={{ width: "100%", minHeight: 54, border: "none", borderRadius: "var(--r-lg)", background: "var(--blue)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : `Save Attendance (${attended.size} attended)`}
        </button>
      </div>
    </main>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<main><Loader label="Loading…" /></main>}>
      <AttendanceContent />
    </Suspense>
  );
}
