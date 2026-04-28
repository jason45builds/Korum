"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────
type MatchData = {
  id: string;
  title: string;
  venueName: string;
  startsAt: string;
  pricePerPlayer: number;
  squadSize: number;
  status: string;
  confirmedCount: number;
  captainName: string;
};

type Step = "loading" | "error" | "landing" | "paying" | "verifying" | "done" | "declined";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const isUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const fmt = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      weekday: "long", day: "numeric", month: "long",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
};

// Load Razorpay script
const loadRzp = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (typeof window.Razorpay !== "undefined") return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PlayerInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router    = useRouter();
  const { profile, isAuthenticated, loading: authLoading } = useAuth();

  const [match,   setMatch]   = useState<MatchData | null>(null);
  const [step,    setStep]    = useState<Step>("loading");
  const [errMsg,  setErrMsg]  = useState("");
  const [joining, setJoining] = useState(false);

  // ── 1. Resolve the token → match data ──────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    void resolveMatch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const resolveMatch = async () => {
    setStep("loading");
    try {
      let matchId = token;

      // If not a UUID it's a short poll token — resolve to matchId via poll API
      if (!isUUID(token)) {
        const pollRes  = await fetch(`/api/poll?token=${token}`);
        const pollData = await pollRes.json() as { match?: { id: string }; error?: string };
        if (!pollRes.ok || !pollData.match?.id) {
          setErrMsg(pollData.error ?? "Match not found");
          setStep("error");
          return;
        }
        matchId = pollData.match.id;
      }

      // Load match details via the public preview endpoint (no auth needed)
      const res  = await fetch(`/api/match/preview?matchId=${matchId}`);
      const data = await res.json() as {
        match?: MatchData;
        error?: string;
      };

      if (!res.ok || !data.match) {
        setErrMsg(data.error ?? "Match not found");
        setStep("error");
        return;
      }

      setMatch(data.match);
      setStep("landing");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Could not load match");
      setStep("error");
    }
  };

  // ── 2. Handle YES — join + pay ──────────────────────────────────────────────
  const handleYes = async () => {
    if (!match) return;

    // Require sign-in
    if (!isAuthenticated) {
      router.push(`/auth?redirect=/p/${token}`);
      return;
    }

    setJoining(true);
    setStep("paying");

    try {
      // Step A: Join the match as a participant
      const joinRes  = await fetch("/api/match/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ matchId: match.id }),
      });
      const joinData = await joinRes.json() as { error?: string };
      // Ignore "already joined" errors — just continue to payment
      if (!joinRes.ok && !joinData.error?.includes("already")) {
        throw new Error(joinData.error ?? "Could not join match");
      }

      // Free match — done
      if (match.pricePerPlayer === 0) {
        setStep("done");
        return;
      }

      // Step B: Create Razorpay order
      const orderRes  = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ matchId: match.id }),
      });
      const orderData = await orderRes.json() as {
        mode?: string;
        paymentId?: string; orderId?: string; amount?: number;
        currency?: string; keyId?: string; matchTitle?: string;
        error?: string;
      };

      if (!orderRes.ok) throw new Error(orderData.error ?? "Payment setup failed");

      // Free / already paid
      if (orderData.mode === "free") {
        setStep("done");
        return;
      }

      // Razorpay modal
      if (orderData.mode === "razorpay") {
        const ready = await loadRzp();
        if (!ready || typeof window.Razorpay === "undefined") {
          // Razorpay script blocked — redirect to full payment page as fallback
          router.push(`/match/payment?matchId=${match.id}`);
          return;
        }

        const rp = new window.Razorpay({
          key:         orderData.keyId!,
          amount:      orderData.amount!,
          currency:    orderData.currency ?? "INR",
          name:        "Korum",
          description: orderData.matchTitle ?? match.title,
          order_id:    orderData.orderId!,
          prefill: {
            name:    profile?.fullName ?? profile?.displayName ?? "",
            contact: profile?.phone ?? "",
          },
          theme:  { color: "#2563EB" },
          modal:  { ondismiss: () => { setStep("landing"); setJoining(false); } },
          handler: async (response) => {
            setStep("verifying");
            try {
              const vRes = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({
                  paymentId:           orderData.paymentId,
                  matchId:             match.id,
                  razorpay_order_id:   response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature:  response.razorpay_signature,
                }),
              });
              if (!vRes.ok) {
                const ve = await vRes.json() as { error?: string };
                throw new Error(ve.error ?? "Verification failed");
              }
              setStep("done");
            } catch (e) {
              setErrMsg(e instanceof Error ? e.message : "Payment verification failed");
              setStep("error");
            }
          },
        });
        rp.open();
        setJoining(false);
        return;
      }

      // manual_upi mode — redirect to full payment page which handles UPI claim
      router.push(`/match/payment?matchId=${match.id}`);

    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Something went wrong");
      setStep("error");
      setJoining(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (step === "loading" || authLoading) return (
    <Shell>
      <div style={S.spinner} />
      <p style={S.meta}>Loading match…</p>
    </Shell>
  );

  if (step === "error") return (
    <Shell>
      <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
      <h2 style={S.title}>Not found</h2>
      <p style={{ ...S.meta, marginBottom: 24 }}>{errMsg || "This link may have expired."}</p>
      <button style={S.btnGhost} onClick={() => router.push("/")}>Go home</button>
    </Shell>
  );

  if (step === "verifying") return (
    <Shell>
      <div style={S.spinner} />
      <p style={S.meta}>Verifying payment…</p>
    </Shell>
  );

  if (step === "done") return (
    <Shell>
      <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
      <h2 style={{ ...S.title, color: "var(--green, #16a34a)" }}>You&apos;re confirmed!</h2>
      <p style={{ ...S.meta, marginBottom: 24 }}>Your spot is locked. See you on the field.</p>
      <button style={S.btnPrimary} onClick={() => router.push(`/match/${match?.id}`)}>
        View Match
      </button>
    </Shell>
  );

  if (step === "declined") return (
    <Shell>
      <div style={{ fontSize: 56, marginBottom: 12 }}>👋</div>
      <h2 style={S.title}>No worries!</h2>
      <p style={{ ...S.meta, marginBottom: 24 }}>Thanks for letting the captain know.</p>
      <button style={S.btnGhost} onClick={() => router.push("/")}>Close</button>
    </Shell>
  );

  if (!match) return null;

  const slotsLeft = Math.max(0, match.squadSize - match.confirmedCount);
  const isFull    = slotsLeft === 0;
  const dateStr   = fmt(match.startsAt);

  return (
    <Shell>
      {/* Match card */}
      <div style={{ width: "100%", background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", marginBottom: 20 }}>
        <div style={{ height: 5, background: "linear-gradient(90deg,#2563EB,#60A5FA)" }} />
        <div style={{ padding: "20px 20px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏏</div>
          <h1 style={{ ...S.title, fontSize: "1.35rem", marginBottom: 6 }}>{match.title}</h1>
          <p style={{ ...S.meta, fontWeight: 600, color: "#222" }}>{dateStr}</p>
          {match.venueName && <p style={S.meta}>📍 {match.venueName}</p>}

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 16 }}>
            {[
              { val: match.confirmedCount, label: "Confirmed", color: "#16a34a" },
              { val: slotsLeft,            label: "Slots left", color: isFull ? "#dc2626" : "#2563EB" },
              { val: match.pricePerPlayer > 0 ? `₹${match.pricePerPlayer}` : "Free", label: "Fee", color: "#b45309" },
            ].map(({ val, label, color }) => (
              <div key={label} style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 6px" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTAs */}
      {isFull ? (
        <div style={{ ...S.pill, background: "#fef2f2", color: "#dc2626", marginBottom: 12 }}>
          Squad is full — no slots available
        </div>
      ) : (
        <button
          style={{ ...S.btnGreen, opacity: joining ? 0.7 : 1 }}
          disabled={joining}
          onClick={() => void handleYes()}>
          {joining ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ ...S.spinnerInline }} /> Joining…
            </span>
          ) : isAuthenticated ? (
            match.pricePerPlayer > 0 ? `✅ I'm In — Pay ₹${match.pricePerPlayer}` : "✅ I'm In"
          ) : (
            "✅ I'm In — Sign In to Join"
          )}
        </button>
      )}

      <button style={{ ...S.btnRed, marginTop: 10 }} onClick={() => setStep("declined")}>
        ❌ Can&apos;t Play
      </button>

      {!isAuthenticated && (
        <p style={{ ...S.meta, fontSize: "0.75rem", marginTop: 12, color: "#999" }}>
          You&apos;ll sign in first, then come back here to confirm your spot.
        </p>
      )}
    </Shell>
  );
}

// ─── Layout shell ─────────────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "1.5rem 1rem",
      background: "linear-gradient(160deg, #EFF6FF 0%, #F0FDF4 100%)",
    }}>
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const S = {
  title:    { margin: "0.15rem 0", fontSize: "1.4rem", fontWeight: 800, color: "#111", lineHeight: 1.2 } as React.CSSProperties,
  meta:     { margin: "0.1rem 0", fontSize: "0.9rem", color: "#555", lineHeight: 1.5 } as React.CSSProperties,
  pill:     { borderRadius: 999, padding: "0.4rem 1.2rem", fontSize: "0.82rem", fontWeight: 700, textAlign: "center" as const, width: "100%" } as React.CSSProperties,
  btnGreen: { width: "100%", padding: "1rem", borderRadius: 999, border: "none", background: "#16a34a", color: "#fff", fontWeight: 800, fontSize: "1rem", cursor: "pointer", transition: "opacity 150ms" } as React.CSSProperties,
  btnRed:   { width: "100%", padding: "0.85rem", borderRadius: 999, border: "none", background: "#dc2626", color: "#fff", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer" } as React.CSSProperties,
  btnPrimary: { width: "100%", padding: "1rem", borderRadius: 999, border: "none", background: "#2563EB", color: "#fff", fontWeight: 800, fontSize: "1rem", cursor: "pointer" } as React.CSSProperties,
  btnGhost: { width: "100%", padding: "0.9rem", borderRadius: 999, border: "1.5px solid #d1d5db", background: "#fff", color: "#555", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" } as React.CSSProperties,
  spinner:  { width: 36, height: 36, border: "3px solid #e4e7eb", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.75s linear infinite", marginBottom: 12 } as React.CSSProperties,
  spinnerInline: { width: 18, height: 18, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 } as React.CSSProperties,
};
