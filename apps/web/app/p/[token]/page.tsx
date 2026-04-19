"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type PollData = {
  link: { id: string; token: string; name: string | null; expiresAt: string };
  match: {
    id: string; title: string; venue_name: string; starts_at: string;
    price_per_player: number; squad_size: number; status: string; join_code: string;
  } | null;
  check: {
    id: string; match_date: string; match_time: string | null; venue_hint: string | null; note: string | null;
  } | null;
  responses: Array<{
    id: string; player_name: string; response: string;
    payment_claimed: boolean; payment_note: string | null; created_at: string;
  }>;
  summary: { yes: number; no: number; maybe: number; total: number };
};

type Step = "landing" | "name" | "response" | "payment" | "done";

export default function PlayerPollPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData]         = useState<PollData | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [step, setStep]         = useState<Step>("landing");
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [response, setResponse] = useState<"YES" | "NO" | "MAYBE" | null>(null);
  const [myResponseId, setMyResponseId] = useState<string | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [paymentClaimed, setPaymentClaimed] = useState(false);

  useEffect(() => { void load(); }, [token]);

  const load = async () => {
    try {
      const res  = await fetch(`/api/poll?token=${token}`);
      const json = await res.json() as PollData & { error?: string };
      if (!res.ok) { setError(json.error ?? "Poll not found"); return; }
      setData(json);
      setStep("landing");
    } catch { setError("Could not load poll"); }
  };

  const submit = async (resp: "YES" | "NO" | "MAYBE") => {
    if (!name.trim() || !data) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/poll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollLinkId:  data.link.id,
          playerName:  name.trim(),
          playerPhone: phone.trim() || undefined,
          response:    resp,
        }),
      });
      const json = await res.json() as { response?: { id: string }; error?: string };
      if (!res.ok) throw new Error(json.error);
      setResponse(resp);
      setMyResponseId(json.response?.id ?? null);
      if (resp === "YES" && data.match?.price_per_player && data.match.price_per_player > 0) {
        setStep("payment");
      } else {
        setStep("done");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit");
    } finally { setSubmitting(false); }
  };

  const claimPayment = async () => {
    if (!myResponseId || !data) return;
    setSubmitting(true);
    try {
      await fetch("/api/poll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollLinkId:     data.link.id,
          playerName:     name,
          response:       "YES",
          responseId:     myResponseId,
          paymentClaimed: true,
          paymentNote:    "Player claimed payment via UPI",
        }),
      });
      setPaymentClaimed(true);
      setStep("done");
    } finally { setSubmitting(false); }
  };

  // ── Loading ──
  if (!data && !error) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={{ color: "#888", marginTop: "1rem", fontSize: "0.9rem" }}>Loading…</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>😕</div>
          <h2 style={{ margin: "0 0 0.5rem", fontWeight: 700 }}>Poll not found</h2>
          <p style={{ color: "#888", fontSize: "0.9rem" }}>{error}</p>
        </div>
      </div>
    );
  }

  const match = data!.match;
  const check = data!.check;
  const summary = data!.summary;

  const matchTitle = match?.title ?? data!.link.name ?? "Match Availability";
  const venueLine  = match?.venue_name ?? check?.venue_hint ?? "";
  const dateLine   = match
    ? new Date(match.starts_at).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : check?.match_date
      ? new Date(check.match_date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) + (check.match_time ? ` · ${check.match_time}` : "")
      : "";

  const price      = match?.price_per_player ?? 0;
  const squadSize  = match?.squad_size ?? 0;
  const confirmed  = data!.responses.filter((r) => r.response === "YES").length;
  const slotsLeft  = squadSize > 0 ? Math.max(0, squadSize - confirmed) : null;

  // ── STEP: LANDING ──
  if (step === "landing") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🏏</div>
          <h1 style={styles.title}>{matchTitle}</h1>
          {dateLine && <p style={styles.meta}>{dateLine}</p>}
          {venueLine && <p style={styles.meta}>📍 {venueLine}</p>}
          {check?.note && (
            <p style={{ ...styles.meta, fontStyle: "italic", marginTop: "0.25rem" }}>
              &ldquo;{check.note}&rdquo;
            </p>
          )}

          {/* Stats row */}
          <div style={styles.statsRow}>
            <div style={styles.stat}>
              <span style={styles.statNum}>{summary.yes}</span>
              <span style={styles.statLabel}>YES</span>
            </div>
            {slotsLeft !== null && (
              <div style={styles.stat}>
                <span style={{ ...styles.statNum, color: slotsLeft > 0 ? "#16a34a" : "#ef4444" }}>
                  {slotsLeft}
                </span>
                <span style={styles.statLabel}>SLOTS LEFT</span>
              </div>
            )}
            {price > 0 && (
              <div style={styles.stat}>
                <span style={{ ...styles.statNum, color: "#d97706" }}>₹{price}</span>
                <span style={styles.statLabel}>PER PLAYER</span>
              </div>
            )}
            <div style={styles.stat}>
              <span style={styles.statNum}>{summary.maybe}</span>
              <span style={styles.statLabel}>MAYBE</span>
            </div>
          </div>

          <button style={{ ...styles.btnPrimary, marginBottom: "0.75rem" }} onClick={() => setStep("name")}>
            Can you play?
          </button>
          <p style={{ fontSize: "0.75rem", color: "#aaa", margin: 0 }}>No account needed · Takes 10 seconds</p>
        </div>
      </div>
    );
  }

  // ── STEP: NAME ──
  if (step === "name") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.title}>What&apos;s your name?</h2>
          <p style={{ color: "#888", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            So the captain knows who responded
          </p>
          <input
            autoFocus
            style={styles.input}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) setStep("response"); }}
          />
          <input
            style={{ ...styles.input, marginTop: "0.75rem" }}
            placeholder="Phone number (optional)"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) setStep("response"); }}
          />
          <button
            style={{ ...styles.btnPrimary, marginTop: "1.25rem", opacity: name.trim() ? 1 : 0.5 }}
            disabled={!name.trim()}
            onClick={() => setStep("response")}
          >
            Continue →
          </button>
          <button style={styles.btnGhost} onClick={() => setStep("landing")}>← Back</button>
        </div>
      </div>
    );
  }

  // ── STEP: RESPONSE ──
  if (step === "response") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.title}>Can you play?</h2>
          <p style={{ color: "#888", fontSize: "0.9rem", marginBottom: "2rem" }}>
            {dateLine && <><strong style={{ color: "#111" }}>{dateLine}</strong><br /></>}
            {venueLine}
          </p>

          <button style={{ ...styles.btnBig, background: "#16a34a" }}
            disabled={submitting} onClick={() => void submit("YES")}>
            {submitting ? "…" : "✅  I&apos;m In"}
          </button>
          <button style={{ ...styles.btnBig, background: "#d97706", marginTop: "0.75rem" }}
            disabled={submitting} onClick={() => void submit("MAYBE")}>
            🤔  Maybe
          </button>
          <button style={{ ...styles.btnBig, background: "#dc2626", marginTop: "0.75rem" }}
            disabled={submitting} onClick={() => void submit("NO")}>
            ❌  Can&apos;t Make It
          </button>

          <button style={{ ...styles.btnGhost, marginTop: "1rem" }} onClick={() => setStep("name")}>← Back</button>
        </div>
      </div>
    );
  }

  // ── STEP: PAYMENT ──
  if (step === "payment" && match) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💰</div>
          <h2 style={styles.title}>Pay ₹{price} to confirm</h2>
          <p style={{ color: "#888", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Pay the captain via UPI to lock your spot
          </p>

          {/* UPI box — captain configures this separately; for now show join code */}
          <div style={{
            background: "#f0fdf4", border: "2px dashed #16a34a", borderRadius: "12px",
            padding: "1.25rem", textAlign: "center", marginBottom: "1.5rem",
          }}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "#555" }}>Share this with captain for reference</p>
            <strong style={{ fontSize: "1.1rem", letterSpacing: "0.1em", color: "#16a34a" }}>
              {match.join_code}
            </strong>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "#888" }}>Match join code</p>
          </div>

          <button style={{ ...styles.btnPrimary, marginBottom: "0.75rem" }}
            disabled={submitting} onClick={() => void claimPayment()}>
            {submitting ? "Saving…" : "✅  I Have Paid"}
          </button>

          <button style={{ ...styles.btnGhost }} onClick={() => setStep("done")}>
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // ── STEP: DONE ──
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>
          {response === "YES" ? "🎉" : response === "MAYBE" ? "🤔" : "👋"}
        </div>
        <h2 style={styles.title}>
          {response === "YES"
            ? paymentClaimed ? "All done!" : "You&apos;re in!"
            : response === "MAYBE" ? "Got it!" : "No worries!"}
        </h2>
        <p style={{ color: "#888", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          {response === "YES"
            ? paymentClaimed
              ? "Captain will confirm your payment. See you on the field!"
              : "Your response is saved. Pay the captain to lock your spot."
            : response === "MAYBE"
              ? "Captain will keep a slot open for you."
              : "Thanks for letting us know. Maybe next time!"}
        </p>

        {/* Show current responses */}
        <div style={styles.statsRow}>
          <div style={styles.stat}>
            <span style={{ ...styles.statNum, color: "#16a34a" }}>{summary.yes + (response === "YES" ? 1 : 0)}</span>
            <span style={styles.statLabel}>YES</span>
          </div>
          <div style={styles.stat}>
            <span style={{ ...styles.statNum, color: "#d97706" }}>{summary.maybe + (response === "MAYBE" ? 1 : 0)}</span>
            <span style={styles.statLabel}>MAYBE</span>
          </div>
          <div style={styles.stat}>
            <span style={{ ...styles.statNum, color: "#dc2626" }}>{summary.no + (response === "NO" ? 1 : 0)}</span>
            <span style={styles.statLabel}>NO</span>
          </div>
        </div>

        <p style={{ fontSize: "0.75rem", color: "#bbb", marginTop: "1rem" }}>
          You can close this page
        </p>
      </div>
    </div>
  );
}

// ── Minimal inline styles — no CSS dependency, works on any device ────────────
const styles = {
  page: {
    minHeight: "100dvh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
    fontFamily: "'DM Sans', -apple-system, sans-serif",
  } as React.CSSProperties,
  card: {
    background: "#fff",
    borderRadius: "24px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
    padding: "2rem 1.5rem",
    width: "min(100%, 380px)",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  } as React.CSSProperties,
  title: {
    margin: "0 0 0.5rem",
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "#111",
    lineHeight: 1.2,
  } as React.CSSProperties,
  meta: {
    margin: "0.15rem 0",
    fontSize: "0.9rem",
    color: "#555",
  } as React.CSSProperties,
  statsRow: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    margin: "1.5rem 0",
    width: "100%",
  } as React.CSSProperties,
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.2rem",
  } as React.CSSProperties,
  statNum: {
    fontSize: "1.8rem",
    fontWeight: 900,
    color: "#111",
    lineHeight: 1,
  } as React.CSSProperties,
  statLabel: {
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "#aaa",
    letterSpacing: "0.08em",
  } as React.CSSProperties,
  input: {
    width: "100%",
    padding: "0.9rem 1rem",
    borderRadius: "12px",
    border: "1.5px solid #e4e4e7",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box" as const,
    textAlign: "left" as const,
  } as React.CSSProperties,
  btnPrimary: {
    width: "100%",
    padding: "1rem",
    borderRadius: "999px",
    border: "none",
    background: "#1a7a4d",
    color: "#fff",
    fontWeight: 800,
    fontSize: "1rem",
    cursor: "pointer",
    transition: "opacity 150ms",
  } as React.CSSProperties,
  btnBig: {
    width: "100%",
    padding: "1.1rem",
    borderRadius: "16px",
    border: "none",
    color: "#fff",
    fontWeight: 800,
    fontSize: "1.05rem",
    cursor: "pointer",
    transition: "opacity 150ms",
  } as React.CSSProperties,
  btnGhost: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#888",
    fontSize: "0.88rem",
    padding: "0.5rem",
    marginTop: "0.25rem",
  } as React.CSSProperties,
  spinner: {
    width: "2.5rem",
    height: "2.5rem",
    border: "3px solid #e4e4e7",
    borderTopColor: "#1a7a4d",
    borderRadius: "999px",
    animation: "spin 0.75s linear infinite",
  } as React.CSSProperties,
};
