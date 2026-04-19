"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Captain = { full_name: string; display_name: string; upi_id: string | null; upi_name: string | null };
type MatchInfo = {
  id: string; title: string; venue_name: string; starts_at: string;
  price_per_player: number; squad_size: number; status: string; join_code: string;
  captain: Captain | null;
};
type CheckInfo = { id: string; match_date: string; match_time: string | null; venue_hint: string | null; note: string | null };
type AnonResponse = { id: string; player_name: string; response: string; payment_claimed: boolean; captain_confirmed: boolean | null };
type PollData = {
  link: { id: string; token: string; name: string | null; expiresAt: string };
  match: MatchInfo | null;
  check: CheckInfo | null;
  responses: AnonResponse[];
  summary: { yes: number; no: number; maybe: number; total: number };
};

type Step = "landing" | "name" | "payment_now" | "claimed" | "no_done" | "maybe_done";

export default function PlayerPollPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData]       = useState<PollData | null>(null);
  const [err,  setErr]        = useState<string | null>(null);
  const [step, setStep]       = useState<Step>("landing");
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [myId, setMyId]       = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [upiCopied, setUpiCopied] = useState(false);

  useEffect(() => { void load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    try {
      const res  = await fetch(`/api/poll?token=${token}`);
      const json = await res.json() as PollData & { error?: string };
      if (!res.ok) { setErr(json.error ?? "Poll not found"); return; }
      setData(json);
    } catch { setErr("Could not load this link"); }
  };

  // Submit YES/NO/MAYBE
  const respond = async (response: "YES" | "NO" | "MAYBE", paymentClaimed = false) => {
    if (!data || !name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/poll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollLinkId: data.link.id, playerName: name.trim(), playerPhone: phone.trim() || undefined, response, paymentClaimed }),
      });
      const json = await res.json() as { response?: { id: string }; error?: string };
      if (!res.ok) throw new Error(json.error);
      setMyId(json.response?.id ?? null);
    } catch (e) { alert(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); }
  };

  const handleYes = async () => {
    await respond("YES", false);
    setStep("payment_now");
  };

  const handleNo = async () => {
    await respond("NO");
    setStep("no_done");
  };

  const handleMaybe = async () => {
    await respond("MAYBE");
    setStep("maybe_done");
  };

  const handleClaimPaid = async () => {
    if (!myId || !data) return;
    setSaving(true);
    try {
      await fetch("/api/poll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollLinkId: data.link.id, playerName: name, response: "YES", responseId: myId, paymentClaimed: true, paymentNote: "Paid via UPI" }),
      });
      setStep("claimed");
    } finally { setSaving(false); }
  };

  const copyUpi = async (upi: string) => {
    try { await navigator.clipboard.writeText(upi); setUpiCopied(true); setTimeout(() => setUpiCopied(false), 2000); } catch { /* ignore */ }
  };

  const openUpiApp = (upi: string, amount: number) => {
    window.location.href = `upi://pay?pa=${encodeURIComponent(upi)}&am=${amount}&cu=INR&tn=Match+spot`;
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (!data && !err) return (
    <Page><Card>
      <Spin />
      <p style={S.meta}>Loading…</p>
    </Card></Page>
  );

  if (err) return (
    <Page><Card>
      <div style={{ fontSize: "3rem" }}>😕</div>
      <h2 style={S.title}>Not found</h2>
      <p style={S.meta}>{err}</p>
    </Card></Page>
  );

  const match    = data!.match;
  const check    = data!.check;
  const summary  = data!.summary;
  const price    = match?.price_per_player ?? 0;
  const isPaid   = price > 0;
  const captain  = match?.captain;
  const upi      = captain?.upi_id;
  const slots    = match?.squad_size ?? 0;
  const yesCount = summary.yes;
  const left     = slots > 0 ? Math.max(0, slots - yesCount) : null;

  const title    = match?.title ?? data!.link.name ?? "Match";
  const venue    = match?.venue_name ?? check?.venue_hint ?? "";
  const dateStr  = match?.starts_at
    ? new Date(match.starts_at).toLocaleString("en-IN", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    : check?.match_date
      ? new Date(check.match_date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) + (check.match_time ? ` · ${check.match_time}` : "")
      : "";

  // ─── LANDING ───────────────────────────────────────────────────────────────
  if (step === "landing") return (
    <Page><Card>
      <div style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>🏏</div>
      <h1 style={{ ...S.title, fontSize: "1.6rem" }}>{title}</h1>
      {dateStr && <p style={{ ...S.meta, fontWeight: 700, color: "#222", marginTop: "0.5rem" }}>{dateStr}</p>}
      {venue   && <p style={S.meta}>📍 {venue}</p>}
      {check?.note && <p style={{ ...S.meta, fontStyle: "italic" }}>&ldquo;{check.note}&rdquo;</p>}

      <div style={S.statsRow}>
        {isPaid && <Stat num={`₹${price}`} label="PER PLAYER" color="#b45309" />}
        <Stat num={String(yesCount)} label="YES" color="#16a34a" />
        {left !== null && <Stat num={String(left)} label="SLOTS LEFT" color={left > 0 ? "#1a7a4d" : "#dc2626"} />}
        {summary.maybe > 0 && <Stat num={String(summary.maybe)} label="MAYBE" color="#d97706" />}
      </div>

      {left === 0
        ? <div style={{ ...S.pill, background: "#fef2f2", color: "#dc2626", marginBottom: "1rem" }}>Squad is full</div>
        : <button style={S.btnGreen} onClick={() => setStep("name")}>Can you play?</button>
      }
      <p style={{ fontSize: "0.72rem", color: "#bbb", marginTop: "0.75rem" }}>No account needed · 10 seconds</p>
    </Card></Page>
  );

  // ─── NAME ──────────────────────────────────────────────────────────────────
  if (step === "name") return (
    <Page><Card>
      <h2 style={S.title}>What&apos;s your name?</h2>
      <p style={{ ...S.meta, marginBottom: "1.5rem" }}>So the captain knows who&apos;s responding</p>

      <input autoFocus style={S.input} placeholder="Your name"
        value={name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) void (async () => { await handleYes(); })(); }} />
      <input style={{ ...S.input, marginTop: "0.75rem" }} placeholder="Phone (optional)" type="tel" inputMode="tel"
        value={phone} onChange={(e) => setPhone(e.target.value)} />

      <div style={{ display: "grid", gap: "0.6rem", marginTop: "1.25rem", width: "100%" }}>
        <button style={{ ...S.btnGreen, opacity: name.trim() ? 1 : 0.4 }}
          disabled={!name.trim() || saving} onClick={() => void handleYes()}>
          {saving ? "Saving…" : isPaid ? `✅  I'm In — Pay ₹${price}` : "✅  I'm In"}
        </button>
        <button style={{ ...S.btnAmber }}
          disabled={saving} onClick={() => void handleMaybe()}>
          🤔  Maybe
        </button>
        <button style={{ ...S.btnRed }}
          disabled={saving} onClick={() => void handleNo()}>
          ❌  Can't Make It
        </button>
      </div>
      <button style={S.btnBack} onClick={() => setStep("landing")}>← Back</button>
    </Card></Page>
  );

  // ─── PAYMENT NOW (mandatory after YES) ────────────────────────────────────
  if (step === "payment_now") return (
    <Page><Card>
      <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💰</div>
      <h2 style={{ ...S.title, fontSize: "1.4rem" }}>Confirm your spot</h2>
      <p style={{ ...S.meta, marginBottom: "1.5rem" }}>Pay to lock your place in the squad</p>

      {/* Amount badge */}
      <div style={{ background: "#f0fdf4", border: "2px solid #86efac", borderRadius: "16px", padding: "1rem 1.5rem", textAlign: "center", marginBottom: "1.5rem", width: "100%" }}>
        <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "#16a34a" }}>₹{price}</div>
        <div style={{ fontSize: "0.78rem", color: "#666", marginTop: "0.25rem" }}>Match fee</div>
      </div>

      {/* Captain UPI details */}
      {upi ? (
        <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: "12px", padding: "1rem", width: "100%", marginBottom: "1.5rem" }}>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", color: "#9a3412", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Pay to captain
          </p>
          <p style={{ margin: "0 0 0.15rem", fontWeight: 700, fontSize: "1rem", color: "#111" }}>
            {captain?.upi_name ?? captain?.display_name ?? captain?.full_name ?? "Captain"}
          </p>
          <p style={{ margin: 0, fontFamily: "monospace", fontSize: "1rem", color: "#b45309", letterSpacing: "0.03em" }}>{upi}</p>
          <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}>
            <button style={{ flex: 1, padding: "0.65rem", borderRadius: "8px", border: "1.5px solid #fb923c", background: "#fff", color: "#ea580c", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}
              onClick={() => void copyUpi(upi)}>
              {upiCopied ? "✓ Copied!" : "Copy UPI"}
            </button>
            <button style={{ flex: 1, padding: "0.65rem", borderRadius: "8px", border: "none", background: "#ea580c", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}
              onClick={() => openUpiApp(upi, price)}>
              Open UPI App
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: "#fafafa", border: "1.5px dashed #d4d4d8", borderRadius: "12px", padding: "1rem", width: "100%", marginBottom: "1.5rem", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#888" }}>Contact the captain for UPI details</p>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", fontWeight: 700, color: "#555" }}>
            Join code: <span style={{ fontFamily: "monospace", color: "#1a7a4d" }}>{match?.join_code}</span>
          </p>
        </div>
      )}

      {/* I have paid */}
      <button style={S.btnGreen} disabled={saving} onClick={() => void handleClaimPaid()}>
        {saving ? "Saving…" : "✅  I Have Paid"}
      </button>
      <p style={{ fontSize: "0.75rem", color: "#aaa", marginTop: "0.75rem" }}>
        Captain will verify and confirm your spot
      </p>
    </Card></Page>
  );

  // ─── CLAIMED — waiting for captain ────────────────────────────────────────
  if (step === "claimed") return (
    <Page><Card>
      <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>⏳</div>
      <h2 style={S.title}>Waiting for confirmation</h2>
      <p style={{ ...S.meta, marginBottom: "1.5rem", lineHeight: 1.6 }}>
        Your payment is noted. The captain will verify and confirm your spot shortly.
      </p>
      <div style={{ ...S.pill, background: "#fef3c7", color: "#92400e" }}>📩 Payment claimed · Pending captain</div>
      <div style={S.statsRow}>
        <Stat num={String(yesCount + 1)} label="YES" color="#16a34a" />
        {left !== null && <Stat num={String(Math.max(0, left - 1))} label="SLOTS LEFT" color="#1a7a4d" />}
      </div>
      <p style={{ fontSize: "0.72rem", color: "#bbb" }}>You can close this page</p>
    </Card></Page>
  );

  // ─── NO / MAYBE done ───────────────────────────────────────────────────────
  if (step === "no_done") return (
    <Page><Card>
      <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>👋</div>
      <h2 style={S.title}>No worries!</h2>
      <p style={{ ...S.meta, lineHeight: 1.6 }}>Thanks for letting the captain know. Maybe next time!</p>
      <div style={S.statsRow}>
        <Stat num={String(yesCount)} label="YES" color="#16a34a" />
        <Stat num={String(summary.no + 1)} label="NO" color="#dc2626" />
      </div>
    </Card></Page>
  );

  return (
    <Page><Card>
      <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🤔</div>
      <h2 style={S.title}>Got it!</h2>
      <p style={{ ...S.meta, lineHeight: 1.6 }}>Captain will keep a slot open if available.</p>
      <div style={S.statsRow}>
        <Stat num={String(yesCount)} label="YES" color="#16a34a" />
        <Stat num={String(summary.maybe + 1)} label="MAYBE" color="#d97706" />
      </div>
    </Card></Page>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function Page({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "linear-gradient(160deg,#f0fdf4,#ecfdf5 60%,#fff)" }}>
      {children}
    </div>
  );
}
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: "24px", boxShadow: "0 8px 48px rgba(0,0,0,0.10)", padding: "2rem 1.5rem", width: "min(100%,390px)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.1rem" }}>
      {children}
    </div>
  );
}
function Stat({ num, label, color }: { num: string; label: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" }}>
      <span style={{ fontSize: "2rem", fontWeight: 900, color: color ?? "#111", lineHeight: 1 }}>{num}</span>
      <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#aaa", letterSpacing: "0.08em" }}>{label}</span>
    </div>
  );
}
function Spin() {
  return <div style={{ width: "2rem", height: "2rem", border: "3px solid #e4e4e7", borderTopColor: "#1a7a4d", borderRadius: "999px", animation: "spin 0.7s linear infinite" }} />;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  title:    { margin: "0.25rem 0 0.25rem", fontSize: "1.5rem", fontWeight: 800, color: "#111", lineHeight: 1.2 } as React.CSSProperties,
  meta:     { margin: "0.1rem 0", fontSize: "0.9rem", color: "#555" } as React.CSSProperties,
  statsRow: { display: "flex", gap: "1.5rem", justifyContent: "center", margin: "1.25rem 0", width: "100%" } as React.CSSProperties,
  pill:     { borderRadius: "999px", padding: "0.4rem 1rem", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.5rem" } as React.CSSProperties,
  input:    { width: "100%", padding: "0.9rem 1rem", borderRadius: "12px", border: "1.5px solid #e4e4e7", fontSize: "1rem", outline: "none", boxSizing: "border-box" as const, background: "#fafafa" } as React.CSSProperties,
  btnGreen: { width: "100%", padding: "1rem", borderRadius: "999px", border: "none", background: "#16a34a", color: "#fff", fontWeight: 800, fontSize: "1rem", cursor: "pointer", transition: "opacity 150ms" } as React.CSSProperties,
  btnAmber: { width: "100%", padding: "0.9rem", borderRadius: "999px", border: "none", background: "#d97706", color: "#fff", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer" } as React.CSSProperties,
  btnRed:   { width: "100%", padding: "0.9rem", borderRadius: "999px", border: "none", background: "#dc2626", color: "#fff", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer" } as React.CSSProperties,
  btnBack:  { background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "0.85rem", padding: "0.5rem", marginTop: "0.25rem" } as React.CSSProperties,
};
