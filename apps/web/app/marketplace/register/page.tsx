"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader } from "@/components/shared/Loader";
import { useAuth } from "@/hooks/useAuth";
import { AuthPanel } from "@/components/shared/AuthPanel";
import { SPORT_OPTIONS } from "@/lib/constants";

const VENDOR_CATEGORIES = ["Kit","Equipment","Food","Photography","Physio","Transport","Other"];
const SURFACES = ["Turf","Concrete","Grass","Clay","Indoor"];
const AMENITIES_LIST = ["Floodlights","Parking","Washrooms","Changing rooms","Canteen","First aid","Scoreboard","Seating"];

const chipStyle = (active: boolean, activeColor = "var(--blue)", activeSoft = "var(--blue-soft)", activeBorder = "var(--blue)"): React.CSSProperties => ({
  padding: "5px 12px", borderRadius: "var(--r-full)", border: "1.5px solid",
  borderColor: active ? activeBorder : "var(--line)",
  background: active ? activeSoft : "var(--surface)",
  color: active ? activeColor : "var(--text-3)",
  fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, cursor: "pointer",
});

function RegisterContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") ?? "vendor") as "vendor" | "ground";
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [err,    setErr]    = useState<string | null>(null);

  const [vForm, setVForm] = useState({
    name: "", category: "Kit", description: "", city: "",
    contactPhone: "", contactEmail: "", website: "", priceNote: "",
    sports: [] as string[],
  });
  const [gForm, setGForm] = useState({
    name: "", address: "", city: "", state: "",
    pricePerHour: "", capacity: "", surface: "Turf",
    amenities: [] as string[], contactPhone: "", contactEmail: "",
    sports: [] as string[],
  });

  const toggleVSport = (s: string) =>
    setVForm(f => ({ ...f, sports: f.sports.includes(s) ? f.sports.filter(x => x !== s) : [...f.sports, s] }));

  const toggleGSport = (s: string) =>
    setGForm(f => ({ ...f, sports: f.sports.includes(s) ? f.sports.filter(x => x !== s) : [...f.sports, s] }));

  const toggleAmenity = (a: string) =>
    setGForm(f => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a] }));

  const handleSubmit = async () => {
    setSaving(true); setErr(null);
    try {
      const endpoint = type === "vendor" ? "/api/vendors" : "/api/grounds";
      const body = type === "vendor"
        ? { ...vForm }
        : {
            ...gForm,
            pricePerHour: gForm.pricePerHour ? Number(gForm.pricePerHour) : null,
            capacity:     gForm.capacity     ? Number(gForm.capacity)     : null,
            sport:        gForm.sports,
          };
      const res = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin", body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed");
      }
      setSaved(true);
      setTimeout(() => router.push("/marketplace"), 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally { setSaving(false); }
  };

  if (authLoading) return <main><Loader label="Loading…" /></main>;
  if (!isAuthenticated) return <main><div className="page"><AuthPanel title="Sign in to register" /></div></main>;

  if (saved) {
    return (
      <main>
        <div className="page" style={{ textAlign: "center", paddingTop: 64 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
          <h2 className="t-h2" style={{ marginBottom: 8 }}>Listed successfully!</h2>
          <p className="t-body" style={{ color: "var(--text-3)" }}>Your listing is under review. Redirecting…</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="page">
        <div>
          <p className="t-caption" style={{ color: "var(--blue)" }}>Marketplace</p>
          <h1 className="t-h2">{type === "vendor" ? "Register your Business" : "List your Ground"}</h1>
          <p className="t-caption" style={{ marginTop: 4, color: "var(--text-3)" }}>
            {type === "vendor"
              ? "Reach sports teams in your city. Kit, equipment, food, physio and more."
              : "Make your venue discoverable to local teams."}
          </p>
        </div>

        <div className="card card-pad">
          <div className="form-stack">

            {type === "vendor" ? (
              <>
                <div className="field">
                  <label className="field-label">Business name *</label>
                  <input className="input" value={vForm.name} placeholder="Sports Hub Chennai"
                    onChange={e => setVForm(f => ({ ...f, name: e.target.value }))} />
                </div>

                <div className="field">
                  <label className="field-label">Category *</label>
                  <select className="select" value={vForm.category}
                    onChange={e => setVForm(f => ({ ...f, category: e.target.value }))}>
                    {VENDOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label className="field-label">City *</label>
                  <input className="input" value={vForm.city} placeholder="Chennai"
                    onChange={e => setVForm(f => ({ ...f, city: e.target.value }))} />
                </div>

                <div className="field">
                  <label className="field-label">Description</label>
                  <textarea className="input" style={{ minHeight: 80 }} value={vForm.description}
                    placeholder="What you offer, turnaround time, delivery…"
                    onChange={e => setVForm(f => ({ ...f, description: e.target.value }))} />
                </div>

                <div className="field">
                  <label className="field-label">Pricing note</label>
                  <input className="input" value={vForm.priceNote} placeholder="₹500/kit · Custom quote available"
                    onChange={e => setVForm(f => ({ ...f, priceNote: e.target.value }))} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field">
                    <label className="field-label">Phone</label>
                    <input className="input" type="tel" value={vForm.contactPhone}
                      onChange={e => setVForm(f => ({ ...f, contactPhone: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label className="field-label">Email</label>
                    <input className="input" type="email" value={vForm.contactEmail}
                      onChange={e => setVForm(f => ({ ...f, contactEmail: e.target.value }))} />
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Sports you serve</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    {SPORT_OPTIONS.slice(0, 10).map(s => (
                      <button key={s} type="button"
                        onClick={() => toggleVSport(s)}
                        style={chipStyle(vForm.sports.includes(s))}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="field">
                  <label className="field-label">Ground name *</label>
                  <input className="input" value={gForm.name} placeholder="Marina Cricket Ground"
                    onChange={e => setGForm(f => ({ ...f, name: e.target.value }))} />
                </div>

                <div className="field">
                  <label className="field-label">Address *</label>
                  <input className="input" value={gForm.address} placeholder="123 Beach Road"
                    onChange={e => setGForm(f => ({ ...f, address: e.target.value }))} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field">
                    <label className="field-label">City *</label>
                    <input className="input" value={gForm.city} placeholder="Chennai"
                      onChange={e => setGForm(f => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label className="field-label">State</label>
                    <input className="input" value={gForm.state} placeholder="Tamil Nadu"
                      onChange={e => setGForm(f => ({ ...f, state: e.target.value }))} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field">
                    <label className="field-label">Price per hour (₹)</label>
                    <input className="input" type="number" value={gForm.pricePerHour} placeholder="500"
                      onChange={e => setGForm(f => ({ ...f, pricePerHour: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label className="field-label">Capacity</label>
                    <input className="input" type="number" value={gForm.capacity} placeholder="22"
                      onChange={e => setGForm(f => ({ ...f, capacity: e.target.value }))} />
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Surface</label>
                  <select className="select" value={gForm.surface}
                    onChange={e => setGForm(f => ({ ...f, surface: e.target.value }))}>
                    {SURFACES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label className="field-label">Amenities</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    {AMENITIES_LIST.map(a => (
                      <button key={a} type="button"
                        onClick={() => toggleAmenity(a)}
                        style={chipStyle(gForm.amenities.includes(a), "#166534", "var(--green-soft)", "var(--green-border)")}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Sports</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    {SPORT_OPTIONS.slice(0, 10).map(s => (
                      <button key={s} type="button"
                        onClick={() => toggleGSport(s)}
                        style={chipStyle(gForm.sports.includes(s))}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field">
                    <label className="field-label">Phone</label>
                    <input className="input" type="tel" value={gForm.contactPhone}
                      onChange={e => setGForm(f => ({ ...f, contactPhone: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label className="field-label">Email</label>
                    <input className="input" type="email" value={gForm.contactEmail}
                      onChange={e => setGForm(f => ({ ...f, contactEmail: e.target.value }))} />
                  </div>
                </div>
              </>
            )}

            {err && (
              <p style={{ margin: 0, padding: "10px 14px", borderRadius: "var(--r-md)", background: "var(--red-soft)", color: "var(--red)", fontSize: 13, fontWeight: 600, border: "1px solid var(--red-border)" }}>
                {err}
              </p>
            )}

            <button
              disabled={saving}
              onClick={() => void handleSubmit()}
              style={{ width: "100%", minHeight: 52, border: "none", borderRadius: "var(--r-lg)", background: "var(--blue)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Submitting…" : "Submit Listing"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main><Loader label="Loading…" /></main>}>
      <RegisterContent />
    </Suspense>
  );
}
