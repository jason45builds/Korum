"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { useAuth } from "@/hooks/useAuth";
import { SPORT_OPTIONS } from "@/lib/constants";

const today = new Date().toISOString().slice(0, 10);

export default function CreateTournamentPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [form, setForm] = useState({
    name: "", description: "", sport: "Cricket", format: "LEAGUE",
    city: "", venueName: "", startsOn: today, endsOn: "",
    registrationCloses: "", maxTeams: 8, minTeams: 4,
    entryFee: 0, prizePool: 0, isPublic: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!authLoading && !isAuthenticated) {
    return <main><div className="page"><AuthPanel title="Sign in to host a tournament" /></div></main>;
  }
  if (authLoading) return <main><Loader /></main>;

  const F = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(c => ({ ...c, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setErr("Enter a tournament name"); return; }
    if (!form.city.trim()) { setErr("Enter a city"); return; }
    setSubmitting(true); setErr(null);
    try {
      const res  = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          ...form,
          maxTeams: Number(form.maxTeams),
          minTeams: Number(form.minTeams),
          entryFee: Number(form.entryFee),
          prizePool: Number(form.prizePool),
          endsOn: form.endsOn || null,
          registrationCloses: form.registrationCloses || null,
          venueName: form.venueName || null,
          description: form.description || null,
        }),
      });
      const data = await res.json() as { tournament?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error);
      router.push(`/tournaments/${data.tournament!.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create tournament");
    } finally { setSubmitting(false); }
  };

  return (
    <main>
      <div className="page-shell">
        <section className="hero-panel animate-in">
          <p className="eyebrow">New Tournament</p>
          <h1 className="title-lg" style={{ marginTop: "0.25rem" }}>Host a tournament</h1>
          <p className="muted" style={{ marginTop: "0.3rem", fontSize: "0.88rem" }}>
            Set it up, open registration, and Korum handles fixtures and standings automatically.
          </p>
        </section>

        <div className="panel animate-in">
          <div className="form-grid">

            <label className="label">
              Tournament name *
              <input className="input" placeholder="Chennai Premier League 2026" value={form.name} onChange={F("name")} />
            </label>

            <label className="label">
              Description
              <textarea className="input" placeholder="Tell teams what to expect…" value={form.description} onChange={F("description")} rows={3} style={{ resize: "vertical" }} />
            </label>

            <div className="grid grid-2" style={{ gap: "0.6rem" }}>
              <label className="label">
                Sport *
                <select className="select" value={form.sport} onChange={F("sport")}>
                  {SPORT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="label">
                Format
                <select className="select" value={form.format} onChange={F("format")}>
                  <option value="LEAGUE">League</option>
                  <option value="KNOCKOUT">Knockout</option>
                  <option value="GROUP_KNOCKOUT">Group + Knockout</option>
                  <option value="ROUND_ROBIN">Round Robin</option>
                </select>
              </label>
            </div>

            <div className="grid grid-2" style={{ gap: "0.6rem" }}>
              <label className="label">
                City *
                <input className="input" placeholder="Chennai" value={form.city} onChange={F("city")} />
              </label>
              <label className="label">
                Venue (optional)
                <input className="input" placeholder="MA Stadium" value={form.venueName} onChange={F("venueName")} />
              </label>
            </div>

            <div className="grid grid-2" style={{ gap: "0.6rem" }}>
              <label className="label">
                Start date *
                <input type="date" className="input" value={form.startsOn} min={today} onChange={F("startsOn")} />
              </label>
              <label className="label">
                End date
                <input type="date" className="input" value={form.endsOn} min={form.startsOn} onChange={F("endsOn")} />
              </label>
            </div>

            <label className="label">
              Registration closes
              <input type="date" className="input" value={form.registrationCloses} max={form.startsOn} onChange={F("registrationCloses")} />
            </label>

            <div className="grid grid-2" style={{ gap: "0.6rem" }}>
              <label className="label">
                Min teams
                <input type="number" className="input" min={2} max={64} value={form.minTeams} onChange={e => setForm(c => ({ ...c, minTeams: Number(e.target.value) }))} />
              </label>
              <label className="label">
                Max teams
                <input type="number" className="input" min={2} max={64} value={form.maxTeams} onChange={e => setForm(c => ({ ...c, maxTeams: Number(e.target.value) }))} />
              </label>
            </div>

            <div className="grid grid-2" style={{ gap: "0.6rem" }}>
              <label className="label">
                Entry fee (₹)
                <input type="number" className="input" min={0} value={form.entryFee} onChange={e => setForm(c => ({ ...c, entryFee: Number(e.target.value) }))} />
              </label>
              <label className="label">
                Prize pool (₹)
                <input type="number" className="input" min={0} value={form.prizePool} onChange={e => setForm(c => ({ ...c, prizePool: Number(e.target.value) }))} />
              </label>
            </div>

            {err && <p className="message-strip error">{err}</p>}

            <button
              onClick={() => void handleSubmit()}
              disabled={submitting}
              style={{ width: "100%", minHeight: 52, border: "none", borderRadius: "var(--r-lg)", background: "var(--blue)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Creating…" : "Create Tournament →"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
