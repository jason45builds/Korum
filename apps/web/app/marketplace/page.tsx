"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/shared/Loader";

// ── Types ────────────────────────────────────────────────────────────────────
type Vendor = {
  id: string; name: string; category: string; description: string | null;
  city: string; contact_phone: string | null; price_note: string | null;
  sports: string[]; is_verified: boolean; distance?: number;
  lat: number | null; lng: number | null;
};
type Ground = {
  id: string; name: string; address: string; city: string;
  sport: string[]; price_per_hour: number | null; capacity: number | null;
  surface: string | null; amenities: string[]; is_verified: boolean;
  contact_phone: string | null; distance?: number;
  lat: number | null; lng: number | null;
};

const VENDOR_CATEGORIES = ["All","Kit","Equipment","Food","Photography","Physio","Transport","Other"];
const CATEGORY_ICONS: Record<string,string> = {
  Kit: "👕", Equipment: "⚽", Food: "🍱", Photography: "📸",
  Physio: "🏥", Transport: "🚌", Other: "🛍️", All: "🏪",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDist = (d?: number) => d && d < 9000 ? (d < 1 ? `${(d * 1000).toFixed(0)}m` : `${d.toFixed(1)}km`) : null;

export default function MarketplacePage() {
  const { profile, isAuthenticated, loading: authLoading } = useAuth();

  const [tab, setTab]             = useState<"grounds" | "vendors">("grounds");
  const [vendors, setVendors]     = useState<Vendor[]>([]);
  const [grounds, setGrounds]     = useState<Ground[]>([]);
  const [loading, setLoading]     = useState(false);
  const [catFilter, setCatFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState(profile?.city ?? "");
  const [userLat, setUserLat]     = useState<number | null>(null);
  const [userLng, setUserLng]     = useState<number | null>(null);
  const [locating, setLocating]   = useState(false);
  const loadedRef = useRef(false);

  // Try get user location for proximity sort
  const getLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setLocating(false); },
      ()  => setLocating(false),
      { timeout: 6000 }
    );
  };

  useEffect(() => {
    void loadAll();
    void getLocation();
  }, []);

  useEffect(() => { void loadAll(); }, [tab, catFilter, cityFilter, userLat, userLng]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cityFilter)  params.set("city", cityFilter);
      if (userLat)     params.set("lat", String(userLat));
      if (userLng)     params.set("lng", String(userLng));
      if (tab === "vendors" && catFilter !== "All") params.set("category", catFilter);

      const url = `/api/${tab}?${params.toString()}`;
      const res = await fetch(url, { credentials: "same-origin" });
      const d   = await res.json() as { vendors?: Vendor[]; grounds?: Ground[] };
      if (tab === "vendors") setVendors(d.vendors ?? []);
      else setGrounds(d.grounds ?? []);
    } finally { setLoading(false); }
  };

  if (authLoading) return <main><Loader label="Loading…" /></main>;

  return (
    <main>
      <div className="page">

        {/* Header */}
        <div>
          <h1 className="t-h2">Marketplace</h1>
          <p className="t-caption" style={{ marginTop: 4, color: "var(--text-3)" }}>
            Find grounds to book and vendors for your squad
          </p>
        </div>

        {/* Location prompt */}
        {!userLat && (
          <div className="card" style={{ padding: "12px 16px", background: "var(--blue-soft)", border: "1px solid var(--blue-border)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>📍</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--blue)" }}>
                Show nearby first
              </p>
              <p className="t-caption" style={{ marginTop: 2 }}>Share your location to sort by distance</p>
            </div>
            <button
              onClick={getLocation}
              disabled={locating}
              style={{ padding: "8px 14px", border: "none", borderRadius: "var(--r-full)", background: "var(--blue)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              {locating ? "…" : "Enable"}
            </button>
          </div>
        )}

        {userLat && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--green-soft)", border: "1px solid var(--green-border)", borderRadius: "var(--r-md)" }}>
            <span style={{ fontSize: 14 }}>📍</span>
            <p style={{ margin: 0, fontSize: 12, color: "#166534", fontWeight: 600 }}>Sorted by distance from you</p>
          </div>
        )}

        {/* City filter */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="input"
            placeholder="Filter by city…"
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            style={{ flex: 1 }}
          />
          {cityFilter && (
            <button onClick={() => setCityFilter("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--text-4)", padding: "0 4px" }}>×</button>
          )}
        </div>

        {/* Tab bar */}
        <div className="tab-bar">
          <button className={`tab ${tab === "grounds" ? "tab--active" : ""}`} onClick={() => setTab("grounds")}>
            🏟️ Grounds
          </button>
          <button className={`tab ${tab === "vendors" ? "tab--active" : ""}`} onClick={() => setTab("vendors")}>
            🛍️ Vendors
          </button>
        </div>

        {/* Vendor category chips */}
        {tab === "vendors" && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
            {VENDOR_CATEGORIES.map(c => (
              <button key={c}
                onClick={() => setCatFilter(c)}
                style={{
                  flexShrink: 0, padding: "6px 14px", borderRadius: "var(--r-full)", border: "1.5px solid",
                  borderColor: catFilter === c ? "var(--blue)" : "var(--line)",
                  background: catFilter === c ? "var(--blue)" : "var(--surface)",
                  color: catFilter === c ? "#fff" : "var(--text-2)",
                  fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  whiteSpace: "nowrap",
                }}>
                {CATEGORY_ICONS[c]} {c}
              </button>
            ))}
          </div>
        )}

        {/* Register CTA */}
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/marketplace/register?type=${tab === "grounds" ? "ground" : "vendor"}`} style={{ flex: 1 }}>
            <button style={{ width: "100%", padding: "10px", border: "1.5px dashed var(--line)", borderRadius: "var(--r-md)", background: "transparent", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--text-3)", cursor: "pointer" }}>
              + Register your {tab === "grounds" ? "ground" : "business"}
            </button>
          </Link>
        </div>

        {/* Loading */}
        {loading && <div style={{ textAlign: "center", padding: 32 }}><Loader label="Loading…" /></div>}

        {/* Grounds list */}
        {!loading && tab === "grounds" && (
          grounds.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🏟️</div>
              <h3 className="t-title" style={{ marginBottom: 8 }}>No grounds found</h3>
              <p className="t-body" style={{ color: "var(--text-3)" }}>
                {cityFilter ? `No grounds listed in "${cityFilter}" yet.` : "Be the first to list a ground!"}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {grounds.map(g => (
                <Link key={g.id} href={`/marketplace/ground/${g.id}`}>
                  <div className="card animate-in" style={{ overflow: "hidden", cursor: "pointer" }}>
                    <div style={{ height: 3, background: g.is_verified ? "var(--green)" : "var(--line)" }} />
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                            <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {g.name}
                            </p>
                            {g.is_verified && <span style={{ fontSize: 14 }}>✅</span>}
                          </div>
                          <p className="t-caption">📍 {g.address}, {g.city}</p>
                        </div>
                        {g.distance !== undefined && fmtDist(g.distance) && (
                          <span className="badge badge-blue" style={{ flexShrink: 0 }}>{fmtDist(g.distance)}</span>
                        )}
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                        {g.sport?.map(s => <span key={s} className="badge">{s}</span>)}
                        {g.surface && <span className="badge" style={{ background: "var(--surface-2)" }}>{g.surface}</span>}
                      </div>

                      <div className="stats-strip" style={{ marginBottom: 0 }}>
                        {g.price_per_hour != null && (
                          <div className="stats-strip__item">
                            <span className="stats-strip__num" style={{ fontSize: 18 }}>₹{g.price_per_hour}</span>
                            <span className="stats-strip__label">per hour</span>
                          </div>
                        )}
                        {g.capacity && (
                          <div className="stats-strip__item">
                            <span className="stats-strip__num" style={{ fontSize: 18 }}>{g.capacity}</span>
                            <span className="stats-strip__label">capacity</span>
                          </div>
                        )}
                        {g.amenities?.length > 0 && (
                          <div className="stats-strip__item">
                            <span className="stats-strip__num" style={{ fontSize: 18 }}>{g.amenities.length}</span>
                            <span className="stats-strip__label">amenities</span>
                          </div>
                        )}
                      </div>

                      {g.amenities?.length > 0 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                          {g.amenities.slice(0,4).map(a => (
                            <span key={a} style={{ fontSize: 11, padding: "2px 8px", background: "var(--surface-2)", borderRadius: "var(--r-full)", color: "var(--text-3)", border: "1px solid var(--line)" }}>{a}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* Vendors list */}
        {!loading && tab === "vendors" && (
          vendors.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🛍️</div>
              <h3 className="t-title" style={{ marginBottom: 8 }}>No vendors found</h3>
              <p className="t-body" style={{ color: "var(--text-3)" }}>
                {cityFilter ? `No vendors in "${cityFilter}" yet.` : "Be the first to list your business!"}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {vendors.map(v => (
                <div key={v.id} className="card animate-in" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "var(--r-md)", background: "var(--blue-soft)", display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0 }}>
                      {CATEGORY_ICONS[v.category] ?? "🛍️"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div>
                          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>
                            {v.name} {v.is_verified && "✅"}
                          </p>
                          <p className="t-caption" style={{ marginTop: 2 }}>📍 {v.city}{v.distance !== undefined && fmtDist(v.distance) ? ` · ${fmtDist(v.distance)}` : ""}</p>
                        </div>
                        <span className="badge">{v.category}</span>
                      </div>
                      {v.description && (
                        <p className="t-caption" style={{ marginTop: 6, lineHeight: 1.5 }}>{v.description}</p>
                      )}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        {v.sports?.map(s => <span key={s} className="badge">{s}</span>)}
                        {v.price_note && <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--amber-soft)", borderRadius: "var(--r-full)", color: "#92400e", border: "1px solid var(--amber-border)" }}>{v.price_note}</span>}
                      </div>
                      {v.contact_phone && (
                        <a href={`tel:${v.contact_phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, padding: "8px 14px", background: "var(--green)", color: "#fff", borderRadius: "var(--r-full)", fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, textDecoration: "none" }}>
                          📞 Call vendor
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

      </div>
    </main>
  );
}
