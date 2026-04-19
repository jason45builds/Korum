"use client";

import { useState } from "react";
import Link from "next/link";

type Match = {
  id: string;
  title: string;
  sport: string;
  venueName: string;
  venueAddress: string;
  startsAt: string;
  squadSize: number;
  pricePerPlayer: number;
  status: string;
  joinCode: string;
  notes: string | null;
  confirmedCount: number;
  captainName: string;
};

type Step = "view" | "name" | "paying" | "pending" | "cant";

const SPORT_EMOJIS: Record<string, string> = {
  Football: "⚽", Cricket: "🏏", Basketball: "🏀", Badminton: "🏸",
  Tennis: "🎾", Hockey: "🏑", Volleyball: "🏐", Rugby: "🏉",
};

export default function PublicMatchClient({ match }: { match: Match }) {
  const [step, setStep]   = useState<Step>("view");
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");
  const [joining, setJoining] = useState(false);
  const [err, setErr]     = useState("");

  const slotsLeft = Math.max(0, match.squadSize - match.confirmedCount);
  const isFull    = slotsLeft === 0;
  const isClosed  = ["LOCKED", "READY"].includes(match.status) || isFull;
  const isFree    = match.pricePerPlayer === 0;

  const sportEmoji = SPORT_EMOJIS[match.sport] ?? "🏅";
  const matchDate  = new Date(match.startsAt);
  const dateStr    = matchDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const timeStr    = matchDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const handleJoin = async () => {
    if (!name.trim()) { setErr("Enter your name to continue."); return; }
    setJoining(true); setErr("");
    try {
      const res  = await fetch("/api/match/public-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, name: name.trim(), phone: phone.trim() || null }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not join");
      setStep("paying");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not join");
    } finally { setJoining(false); }
  };

  const handlePaid = async () => {
    setJoining(true);
    try {
      await fetch("/api/match/public-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, name: name.trim() }),
      });
      setStep("pending");
    } catch { setStep("pending"); }
    finally { setJoining(false); }
  };

  // ── Styles ──────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "#fff", borderRadius: "20px", padding: "1.5rem",
    boxShadow: "0 4px 24px rgba(15,26,20,0.10)", border: "1.5px solid #d4dfd8",
    marginBottom: "1rem",
  };

  const bigBtn = (bg: string, color = "#fff"): React.CSSProperties => ({
    display: "block", width: "100%", padding: "1.1rem",
    background: bg, color, border: "none", borderRadius: "14px",
    fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem",
    cursor: "pointer", textAlign: "center", marginBottom: "0.75rem",
    boxShadow: `0 4px 16px ${bg}55`,
  });

  const root: React.CSSProperties = {
    minHeight: "100dvh", background: "var(--bg)", padding: "1rem",
    maxWidth: "480px", margin: "0 auto",
  };

  // ── STEP: view ───────────────────────────────────────────────────────
  if (step === "view") {
    return (
      <div style={root}>
        {/* Match card */}
        <div style={{ ...card, background: "var(--primary)", color: "#fff", border: "none" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{sportEmoji}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", margin: "0 0 0.25rem", lineHeight: 1.2 }}>
            {match.title}
          </h1>
          <p style={{ margin: "0 0 1rem", opacity: 0.85, fontSize: "0.95rem" }}>
            {dateStr} · {timeStr}
          </p>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            {[
              { label: "Players", value: `${match.confirmedCount}/${match.squadSize}` },
              { label: "Cost",    value: isFree ? "Free" : `₹${match.pricePerPlayer}` },
              { label: "Slots",   value: isFull ? "Full" : `${slotsLeft} left` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.15)", borderRadius: "10px", padding: "0.6rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, fontFamily: "var(--font-display)" }}>{value}</div>
                <div style={{ fontSize: "0.72rem", opacity: 0.8, marginTop: "0.1rem" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div style={card}>
          <div style={{ display: "grid", gap: "0.6rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <span>📍</span>
              <div>
                <strong style={{ fontSize: "0.95rem" }}>{match.venueName}</strong>
                {match.venueAddress && <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>{match.venueAddress}</div>}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <span>🧢</span>
              <span style={{ fontSize: "0.9rem" }}>Captain: <strong>{match.captainName}</strong></span>
            </div>
            {match.notes && (
              <div style={{ background: "var(--surface-muted)", borderRadius: "10px", padding: "0.75rem", fontSize: "0.88rem", color: "var(--text-muted)" }}>
                {match.notes}
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        {isClosed ? (
          <div style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🔒</div>
            <strong>{isFull ? "Squad is full" : "Match is locked"}</strong>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginTop: "0.3rem" }}>
              No more slots available.
            </p>
          </div>
        ) : (
          <>
            <button style={bigBtn("var(--primary)")} onClick={() => setStep("name")}>
              ✅ I&apos;m In — Join Now
            </button>
            <button style={{ ...bigBtn("transparent", "var(--text-muted)"), border: "1.5px solid var(--line)", boxShadow: "none" }}
              onClick={() => setStep("cant")}>
              ❌ Can&apos;t Play
            </button>
          </>
        )}

        <p style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--text-faint)", marginTop: "0.5rem" }}>
          Powered by Korum
        </p>
      </div>
    );
  }

  // ── STEP: cant ───────────────────────────────────────────────────────
  if (step === "cant") {
    return (
      <div style={root}>
        <div style={{ ...card, textAlign: "center", padding: "2.5rem 1.5rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>😔</div>
          <h2 style={{ fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>No worries!</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.92rem" }}>
            The captain has been notified. Hope to see you next time!
          </p>
          <button style={{ ...bigBtn("var(--surface-muted)", "var(--text)"), marginTop: "1.5rem", boxShadow: "none", border: "1.5px solid var(--line)" }}
            onClick={() => setStep("view")}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── STEP: name ───────────────────────────────────────────────────────
  if (step === "name") {
    return (
      <div style={root}>
        <div style={card}>
          <h2 style={{ fontFamily: "var(--font-display)", marginBottom: "0.25rem" }}>Quick confirm</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
            {match.title} · {timeStr}
          </p>
          <div style={{ display: "grid", gap: "1rem" }}>
            <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.88rem", fontWeight: 600, fontFamily: "var(--font-display)" }}>
              Your name *
              <input className="input" placeholder="Arjun Sharma" value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleJoin(); }}
                style={{ fontSize: "1rem" }} />
            </label>
            <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.88rem", fontWeight: 600, fontFamily: "var(--font-display)" }}>
              Phone <span style={{ fontWeight: 400, color: "var(--text-faint)" }}>(optional, for updates)</span>
              <input className="input" type="tel" inputMode="tel" placeholder="+91 98765 43210"
                value={phone} onChange={(e) => setPhone(e.target.value)} style={{ fontSize: "1rem" }} />
            </label>
            {err && <p style={{ color: "var(--danger)", fontSize: "0.88rem", margin: 0 }}>{err}</p>}
            <button style={bigBtn("var(--primary)")} onClick={() => void handleJoin()} disabled={joining}>
              {joining ? "Joining…" : isFree ? "Confirm — I'm Playing!" : `Continue to Pay ₹${match.pricePerPlayer}`}
            </button>
            <button style={{ ...bigBtn("transparent", "var(--text-muted)"), boxShadow: "none", border: "1.5px solid var(--line)" }}
              onClick={() => setStep("view")}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP: paying ─────────────────────────────────────────────────────
  if (step === "paying") {
    const upiId = `captain@upi`; // captain's UPI — in real app pulled from match/team
    return (
      <div style={root}>
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💰</div>
          <h2 style={{ fontFamily: "var(--font-display)", marginBottom: "0.25rem" }}>Pay to confirm</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Pay ₹{match.pricePerPlayer} to lock your spot in {match.title}
          </p>

          {/* Big amount */}
          <div style={{ background: "var(--primary-soft)", borderRadius: "16px", padding: "1.25rem", marginBottom: "1.25rem" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 800, color: "var(--primary)" }}>
              ₹{match.pricePerPlayer}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--primary-dark)", marginTop: "0.25rem" }}>
              To: {match.captainName}
            </div>
          </div>

          {/* UPI row */}
          <div style={{ background: "var(--surface-muted)", borderRadius: "12px", padding: "0.85rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", border: "1px solid var(--line)" }}>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", marginBottom: "0.15rem", fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase" }}>UPI ID</div>
              <strong style={{ fontFamily: "monospace", fontSize: "0.95rem" }}>{upiId}</strong>
            </div>
            <button onClick={() => void navigator.clipboard.writeText(upiId)}
              style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", padding: "0.45rem 0.85rem", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
              Copy
            </button>
          </div>

          {/* Open UPI apps */}
          <button style={bigBtn("var(--primary)")}
            onClick={() => { window.location.href = `upi://pay?pa=${upiId}&am=${match.pricePerPlayer}&tn=${encodeURIComponent(match.title)}`; }}>
            📱 Open UPI App
          </button>

          <button style={{ ...bigBtn("#16a34a"), marginBottom: "0.75rem" }} onClick={() => void handlePaid()} disabled={joining}>
            {joining ? "Recording…" : "✅ I Have Paid"}
          </button>

          <p style={{ fontSize: "0.78rem", color: "var(--text-faint)" }}>
            Your spot is reserved. The captain will confirm once payment is verified.
          </p>
        </div>
      </div>
    );
  }

  // ── STEP: pending ────────────────────────────────────────────────────
  return (
    <div style={root}>
      <div style={{ ...card, textAlign: "center", padding: "2.5rem 1.5rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>⏳</div>
        <h2 style={{ fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>Waiting for confirmation</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", lineHeight: 1.6 }}>
          Hey <strong>{name}</strong>, your payment is being verified by the captain.
          You&apos;ll receive a confirmation once it&apos;s approved.
        </p>
        <div style={{ marginTop: "1.5rem", padding: "1rem", background: "var(--surface-muted)", borderRadius: "12px" }}>
          <strong style={{ fontSize: "0.9rem" }}>{match.title}</strong>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{dateStr} · {timeStr}</div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>📍 {match.venueName}</div>
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--text-faint)", marginTop: "1.25rem" }}>
          Powered by Korum · <a href="/" style={{ color: "var(--primary)" }}>Open app</a>
        </p>
      </div>
    </div>
  );
}
