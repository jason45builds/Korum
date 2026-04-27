"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader } from "@/components/shared/Loader";
import { useAuth } from "@/hooks/useAuth";

type Ground = {
  id: string; name: string; address: string; city: string; state: string | null;
  sport: string[]; price_per_hour: number | null; capacity: number | null;
  surface: string | null; amenities: string[]; is_verified: boolean;
  contact_phone: string | null; contact_email: string | null;
  lat: number | null; lng: number | null; photos: string[];
  owner_id: string | null;
};

export default function GroundDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const { profile, isAuthenticated } = useAuth();

  const [ground, setGround] = useState<Ground | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingMsg, setBookingMsg] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/grounds/${id}`);
      if (res.ok) {
        const d = await res.json() as { ground: Ground };
        setGround(d.ground);
      }
    } finally { setLoading(false); }
  };

  if (loading) return <main><Loader label="Loading ground…" /></main>;
  if (!ground) {
    return (
      <main>
        <div className="page" style={{ textAlign: "center", paddingTop: 48 }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🔍</div>
          <h2 className="t-h2">Ground not found</h2>
          <button className="btn btn--ghost" onClick={() => router.back()} style={{ marginTop: 16 }}>← Back</button>
        </div>
      </main>
    );
  }

  // Build OpenStreetMap embed URL
  const hasLocation = ground.lat != null && ground.lng != null;
  const mapUrl = hasLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${ground.lng! - 0.005},${ground.lat! - 0.005},${ground.lng! + 0.005},${ground.lat! + 0.005}&layer=mapnik&marker=${ground.lat},${ground.lng}`
    : null;

  // Build Google Maps link for opening native app
  const mapsLink = hasLocation
    ? `https://www.google.com/maps?q=${ground.lat},${ground.lng}`
    : `https://www.google.com/maps/search/${encodeURIComponent(`${ground.name} ${ground.address} ${ground.city}`)}`;

  const callGround = () => {
    if (ground.contact_phone) window.location.href = `tel:${ground.contact_phone}`;
  };

  const shareWhatsApp = () => {
    const text = `🏟️ *${ground.name}*\n📍 ${ground.address}, ${ground.city}\n${ground.price_per_hour ? `💰 ₹${ground.price_per_hour}/hour` : ""}\n\nBook this ground: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <main>
      <div className="page">

        {/* Back */}
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "var(--text-3)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, padding: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          Grounds
        </button>

        {/* Header card */}
        <div className="card animate-in" style={{ overflow: "hidden" }}>
          <div style={{ height: 4, background: ground.is_verified ? "var(--green)" : "var(--line)" }} />
          <div style={{ padding: "16px 16px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
              <div>
                <h1 className="t-h2" style={{ marginBottom: 4 }}>
                  {ground.name} {ground.is_verified && "✅"}
                </h1>
                <p className="t-caption">📍 {ground.address}, {ground.city}{ground.state ? `, ${ground.state}` : ""}</p>
              </div>
            </div>

            {/* Sport + surface chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {ground.sport?.map(s => <span key={s} className="badge badge-blue">{s}</span>)}
              {ground.surface && <span className="badge" style={{ background: "var(--surface-2)" }}>{ground.surface}</span>}
            </div>

            {/* Stats */}
            <div className="stats-strip" style={{ marginBottom: 14 }}>
              {ground.price_per_hour != null && (
                <div className="stats-strip__item">
                  <span className="stats-strip__num" style={{ color: "var(--green)" }}>₹{ground.price_per_hour}</span>
                  <span className="stats-strip__label">per hour</span>
                </div>
              )}
              {ground.capacity && (
                <div className="stats-strip__item">
                  <span className="stats-strip__num">{ground.capacity}</span>
                  <span className="stats-strip__label">capacity</span>
                </div>
              )}
            </div>

            {/* Amenities */}
            {ground.amenities?.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ground.amenities.map(a => (
                  <span key={a} style={{ fontSize: 12, padding: "4px 10px", background: "var(--blue-soft)", borderRadius: "var(--r-full)", color: "var(--blue)", border: "1px solid var(--blue-border)", fontWeight: 600 }}>
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── MAP ── */}
        <div className="card animate-in" style={{ overflow: "hidden" }}>
          <div style={{ padding: "12px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
            <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Location
            </p>
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: "var(--blue)", fontFamily: "var(--font-display)", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              Open in Maps ↗
            </a>
          </div>

          {mapUrl ? (
            <>
              <iframe
                title={`Map of ${ground.name}`}
                src={mapUrl}
                width="100%"
                height="240"
                style={{ border: "none", display: "block" }}
                loading="lazy"
              />
              <div style={{ padding: "10px 16px", background: "var(--surface-2)", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>📍</span>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-3)", flex: 1 }}>{ground.address}, {ground.city}</p>
                <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                  style={{ padding: "6px 14px", border: "none", borderRadius: "var(--r-full)", background: "var(--blue)", color: "#fff", fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                  Get directions
                </a>
              </div>
            </>
          ) : (
            <div style={{ padding: "24px 16px" }}>
              <p className="t-caption" style={{ marginBottom: 12 }}>Exact coordinates not available. Search for this ground:</p>
              <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", border: "none", borderRadius: "var(--r-lg)", background: "var(--blue)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                🗺️ Open in Google Maps
              </a>
            </div>
          )}
        </div>

        {/* ── Contact + action buttons ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ground.contact_phone && (
            <button
              onClick={callGround}
              style={{ width: "100%", minHeight: 52, border: "none", borderRadius: "var(--r-lg)", background: "var(--green)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              📞 Call to Book — {ground.contact_phone}
            </button>
          )}

          <button
            onClick={shareWhatsApp}
            style={{ width: "100%", minHeight: 48, border: "none", borderRadius: "var(--r-lg)", background: "#25D366", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Share this ground
          </button>

          {ground.contact_email && (
            <a href={`mailto:${ground.contact_email}?subject=Ground booking enquiry - ${ground.name}`}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", border: "1.5px solid var(--line)", borderRadius: "var(--r-lg)", background: "var(--surface)", color: "var(--text)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              📧 Email for enquiry
            </a>
          )}
        </div>

        {bookingMsg && (
          <div style={{ padding: "12px 16px", background: "var(--green-soft)", border: "1px solid var(--green-border)", borderRadius: "var(--r-md)" }}>
            <p style={{ margin: 0, color: "#166534", fontWeight: 600, fontSize: 14 }}>{bookingMsg}</p>
          </div>
        )}

      </div>
    </main>
  );
}
