"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { getMyTeams } from "@/services/api/team";
import { SPORT_OPTIONS } from "@/lib/constants";
import type { TeamDetails } from "@korum/types/team";

export default function ProfilePage() {
  const { profile, isAuthenticated, loading: authLoading, signOut, saveProfile } = useAuth();
  const [teams, setTeams]       = useState<TeamDetails[]>([]);
  const [loading, setLoading]   = useState(false);
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState<{ text: string; ok: boolean } | null>(null);

  const [form, setForm] = useState({
    fullName: "", displayName: "", city: "", defaultSport: "", upiId: "", upiName: "", role: "player" as "captain" | "player",
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    getMyTeams().then(r => setTeams(r.teams)).catch(() => {}).finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      fullName:    profile.fullName ?? "",
      displayName: profile.displayName ?? "",
      city:        profile.city ?? "",
      defaultSport: profile.defaultSport ?? "",
      upiId:       profile.upiId ?? "",
      upiName:     profile.upiName ?? "",
      role:        profile.role ?? "player",
    });
  }, [profile?.id]);

  if (!authLoading && !isAuthenticated) {
    return (
      <main>
        <div className="page">
          <div style={{ textAlign: "center", padding: "48px 0 24px" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--surface-2)", border: "2px solid var(--line)", display: "grid", placeItems: "center", margin: "0 auto 16px", fontSize: 32 }}>👤</div>
            <h2 className="t-h2" style={{ marginBottom: 8 }}>Your Profile</h2>
            <p className="t-body" style={{ color: "var(--text-3)", marginBottom: 24 }}>Sign in to view your stats and settings.</p>
          </div>
          <AuthPanel />
        </div>
      </main>
    );
  }
  if (authLoading || loading) return <main><Loader label="Loading profile…" /></main>;

  const ini = (name?: string | null) => (name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const score = profile?.reliabilityScore ?? 100;
  const scoreColor = score >= 80 ? "var(--green)" : score >= 60 ? "var(--amber)" : "var(--red)";

  const handleSave = async () => {
    setSaving(true); setSaveMsg(null);
    try {
      await saveProfile({
        fullName: form.fullName,
        displayName: form.displayName || form.fullName,
        city: form.city || null,
        defaultSport: form.defaultSport || null,
        role: form.role,
        upiId: form.upiId || null,
        upiName: form.upiName || null,
      });
      setSaveMsg({ text: "Profile saved!", ok: true });
      setEditing(false);
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e) {
      setSaveMsg({ text: e instanceof Error ? e.message : "Failed to save", ok: false });
    } finally { setSaving(false); }
  };

  return (
    <main>
      <div className="page">

        {/* Avatar + name */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0 8px", textAlign: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--blue-soft)", border: "3px solid var(--blue-border)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 28, color: "var(--blue)", marginBottom: 14 }}>
            {ini(profile?.displayName)}
          </div>
          <h1 className="t-h2">{profile?.displayName ?? "Player"}</h1>
          {profile?.city && <p className="t-caption" style={{ marginTop: 2 }}>📍 {profile.city}</p>}
        </div>

        {/* Stats strip */}
        <div className="stats-strip">
          <div className="stats-strip__item">
            <span className="stats-strip__num">{teams.length}</span>
            <span className="stats-strip__label">Teams</span>
          </div>
          <div className="stats-strip__item">
            <span className="stats-strip__num" style={{ color: scoreColor }}>{score}</span>
            <span className="stats-strip__label">Reliability</span>
          </div>
          <div className="stats-strip__item">
            <span className="stats-strip__num" style={{ color: "var(--blue)", fontSize: 14 }}>
              {profile?.role === "captain" ? "⚡ Cap" : "👤 Player"}
            </span>
            <span className="stats-strip__label">Role</span>
          </div>
        </div>

        {/* Reliability explainer */}
        <div className="card" style={{ padding: "12px 16px", background: score < 80 ? "var(--amber-soft)" : "var(--green-soft)", border: `1px solid ${score < 80 ? "var(--amber-border)" : "var(--green-border)"}` }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: score < 80 ? "#92400e" : "#166534" }}>
            {score >= 90 ? "⭐ Excellent — You're a captain's first pick" : score >= 80 ? "✅ Good — Reliable squad member" : score >= 60 ? "⚠️ Average — A few no-shows. Be consistent!" : "❌ Low — Captains may not pick you. Improve by attending matches."}
          </p>
        </div>

        {/* Edit form */}
        {editing ? (
          <div className="card card-pad">
            <p style={{ margin: "0 0 16px", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16 }}>Edit Profile</p>
            <div className="form-stack">
              <div className="field">
                <label className="field-label">Full name</label>
                <input className="input" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div className="field">
                <label className="field-label">Display name</label>
                <input className="input" placeholder="How others see you" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label className="field-label">City</label>
                  <input className="input" placeholder="Chennai" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="field-label">Sport</label>
                  <select className="select" value={form.defaultSport} onChange={e => setForm(f => ({ ...f, defaultSport: e.target.value }))}>
                    <option value="">Any</option>
                    {SPORT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Role</label>
                <select className="select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as "captain" | "player" }))}>
                  <option value="player">Player</option>
                  <option value="captain">Captain</option>
                </select>
              </div>

              {/* UPI section */}
              <div style={{ padding: "12px 14px", background: "var(--amber-soft)", borderRadius: "var(--r-md)", border: "1px solid var(--amber-border)" }}>
                <p style={{ margin: "0 0 10px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#92400e" }}>💰 Payment details (for captains)</p>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label className="field-label">UPI ID</label>
                  <input className="input" placeholder="yourname@upi" value={form.upiId} onChange={e => setForm(f => ({ ...f, upiId: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="field-label">Payment name</label>
                  <input className="input" placeholder="Jason (Captain)" value={form.upiName} onChange={e => setForm(f => ({ ...f, upiName: e.target.value }))} />
                </div>
              </div>

              {saveMsg && (
                <p style={{ margin: 0, padding: "10px 14px", borderRadius: "var(--r-md)", fontSize: 13, fontWeight: 600, background: saveMsg.ok ? "var(--green-soft)" : "var(--red-soft)", color: saveMsg.ok ? "#166534" : "#991b1b" }}>
                  {saveMsg.text}
                </p>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button className="btn btn--primary btn--block" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button className="btn btn--ghost btn--block" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ overflow: "hidden" }}>
            {[
              { icon: "✏️", label: "Edit Profile", action: () => setEditing(true) },
            ].map(({ icon, label, action }) => (
              <div key={label} onClick={action} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer" }}>
                <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{icon}</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, flex: 1 }}>{label}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
              </div>
            ))}
          </div>
        )}

        {/* My Teams */}
        {teams.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="section-row">
              <span className="section-label">My Teams</span>
              <Link href="/teams" className="section-action">Manage</Link>
            </div>
            {teams.map(t => (
              <Link key={t.id} href={`/team/${t.id}`}>
                <div className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "var(--blue-soft)", display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0 }}>🏟️</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14 }}>{t.name}</p>
                    <p className="t-caption" style={{ marginTop: 2 }}>{t.sport} · {t.city} · {t.members.length} members</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="card" style={{ overflow: "hidden" }}>
          {[
            { href: "/create/match", icon: "🏏", label: "Create a Match" },
            { href: "/match/join",   icon: "🔗", label: "Join a Match" },
            { href: "/availability", icon: "📋", label: "My Availability" },
          ].map(({ href, icon, label }, i, arr) => (
            <Link key={href} href={href}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none", cursor: "pointer" }}>
                <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{icon}</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, flex: 1 }}>{label}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Sign out */}
        <div className="card" style={{ overflow: "hidden" }}>
          <button onClick={() => void signOut()} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
            <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>🚪</span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--red)", flex: 1 }}>Sign Out</span>
          </button>
        </div>

        <p className="t-caption" style={{ textAlign: "center", color: "var(--text-4)" }}>Korum · Match Readiness Platform</p>
      </div>
    </main>
  );
}
