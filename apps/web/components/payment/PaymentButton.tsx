"use client";

import { useState } from "react";
import type { UserProfile } from "@korum/types/user";
import { Confetti, haptic } from "@/components/shared/Animations";
import { track } from "@/lib/analytics";

type OrderResponse =
  | {
      mode: "razorpay";
      paymentId: string; orderId: string; amount: number;
      currency: string; keyId: string; matchId: string;
      matchTitle: string; matchFee: number; platformFee: number;
    }
  | { mode: "manual_upi"; amount: number; captainName: string; upiId: string | null; matchTitle: string; participantId?: string }
  | { mode: "free" };

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (typeof window.Razorpay !== "undefined") return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export function PaymentButton({
  matchId, profile, onComplete,
}: {
  matchId: string; profile?: UserProfile | null; onComplete?: () => void;
}) {
  const [state,    setState]   = useState<"idle"|"loading"|"upi"|"verifying"|"claimed"|"done"|"error">("idle");
  const [order,    setOrder]   = useState<OrderResponse | null>(null);
  const [errMsg,   setErrMsg]  = useState<string | null>(null);
  const [copied,   setCopied]  = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const handlePay = async () => {
    setState("loading");
    setErrMsg(null);
    track("match_payment_started", { matchId });

    try {
      const res  = await fetch("/api/payments/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin", body: JSON.stringify({ matchId }),
      });
      const data = await res.json() as OrderResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create order");

      if (data.mode === "free") {
        haptic("success");
        setCelebrate(true);
        setState("done");
        track("match_payment_completed", { matchId, mode: "free" });
        onComplete?.();
        return;
      }

      setOrder(data);

      if (data.mode === "manual_upi") { setState("upi"); return; }

      // Razorpay
      const ready = await loadRazorpayScript();
      if (!ready || typeof window.Razorpay === "undefined") { setState("upi"); return; }

      const rp = new window.Razorpay({
        key: data.keyId, amount: data.amount, currency: data.currency,
        name: "Korum", description: data.matchTitle, order_id: data.orderId,
        prefill: { name: profile?.fullName ?? profile?.displayName ?? "", contact: profile?.phone ?? "" },
        theme: { color: "#2563EB" },
        modal: { ondismiss: () => setState("idle") },
        handler: async (response) => {
          setState("verifying");
          try {
            const vRes = await fetch("/api/payments/verify", {
              method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
              body: JSON.stringify({
                paymentId: data.paymentId, matchId: data.matchId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            if (!vRes.ok) { const e = await vRes.json() as { error?: string }; throw new Error(e.error ?? "Verification failed"); }
            haptic("success");
            setCelebrate(true);
            setState("done");
            track("match_payment_completed", { matchId, mode: "razorpay" });
            onComplete?.();
          } catch (e) {
            track("match_payment_failed", { matchId, reason: e instanceof Error ? e.message : "unknown" });
            setState("error");
            setErrMsg(e instanceof Error ? e.message : "Payment verification failed");
          }
        },
      });
      rp.open();
      setState("idle");
    } catch (e) {
      track("match_payment_failed", { matchId, reason: e instanceof Error ? e.message : "unknown" });
      setState("error");
      setErrMsg(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const copyUpi = async (upi: string) => {
    try { await navigator.clipboard.writeText(upi); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* ignore */ }
  };

  const openUpiApp = (upi: string, amount: number) => {
    window.location.href = `upi://pay?pa=${encodeURIComponent(upi)}&am=${amount}&cu=INR&tn=Korum+Match+Fee`;
  };

  const claimPaid = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await fetch("/api/participants/claim-paid", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ matchId }),
      });
      if (!res.ok) { const e = await res.json() as { error?: string }; throw new Error(e.error ?? "Failed"); }
      haptic("medium");
      setState("claimed");
    } catch (e) { setErrMsg(e instanceof Error ? e.message : "Failed"); setState("error"); }
    finally { setClaiming(false); }
  };

  // ── States ─────────────────────────────────────────────────────────────────

  if (state === "done") {
    return (
      <div style={{ position: "relative" }}>
        <Confetti active={celebrate} count={80} origin={[50, 60]} />
        <div style={{ textAlign: "center", padding: "28px 20px", background: "var(--green-soft)", borderRadius: "var(--r-xl)", border: "2px solid var(--green-border)", animation: "up 300ms ease both" }}>
          <div style={{ fontSize: 52, marginBottom: 12, animation: "starPop 500ms ease both" }}>✅</div>
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 20, color: "var(--green)" }}>
            You&apos;re confirmed!
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "#166534", lineHeight: 1.5 }}>
            Your spot is locked. Squad, payments and venue — all set.
            <br />See you on the field! 🏏
          </p>
        </div>
        <style>{`@keyframes starPop{0%{transform:scale(0) rotate(-20deg);opacity:0}60%{transform:scale(1.2) rotate(5deg);opacity:1}100%{transform:scale(1);opacity:1}}`}</style>
      </div>
    );
  }

  if (state === "claimed") {
    return (
      <div style={{ textAlign: "center", padding: "24px", background: "var(--amber-soft)", borderRadius: "var(--r-lg)", border: "1.5px solid var(--amber-border)" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>⏳</div>
        <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, color: "var(--amber)" }}>Waiting for captain</p>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-3)" }}>
          Your payment is noted. The captain will verify and confirm your spot shortly.
        </p>
      </div>
    );
  }

  if (state === "verifying") {
    return (
      <div style={{ textAlign: "center", padding: "24px" }}>
        <div style={{ width: 36, height: 36, border: "3px solid var(--line)", borderTopColor: "var(--blue)", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-3)" }}>Verifying payment…</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ padding: "14px 16px", background: "var(--red-soft)", borderRadius: "var(--r-md)", border: "1px solid var(--red-border)" }}>
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--red)" }}>Payment failed</p>
          {errMsg && <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-2)" }}>{errMsg}</p>}
        </div>
        <button onClick={() => { setState("idle"); setErrMsg(null); }} className="btn btn--ghost btn--block">Try Again</button>
      </div>
    );
  }

  if (state === "upi" && order?.mode === "manual_upi") {
    const { amount, captainName, upiId } = order;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ textAlign: "center", padding: "16px", background: "var(--blue-soft)", borderRadius: "var(--r-lg)", border: "1.5px solid var(--blue-border)" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Match fee</p>
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 36, color: "var(--blue)" }}>₹{amount}</p>
        </div>
        {upiId ? (
          <div style={{ padding: "14px 16px", background: "var(--surface-2)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Pay to</p>
            <p style={{ margin: "0 0 2px", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16 }}>{captainName}</p>
            <p style={{ margin: 0, fontFamily: "monospace", fontSize: 14, color: "var(--amber)", letterSpacing: "0.03em" }}>{upiId}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              <button onClick={() => void copyUpi(upiId)} className="btn btn--ghost btn--sm">
                {copied ? "✓ Copied" : "📋 Copy UPI"}
              </button>
              <button onClick={() => openUpiApp(upiId, amount)}
                style={{ minHeight: 36, border: "none", borderRadius: "var(--r-full)", background: "#F97316", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                Open UPI App
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: "14px", textAlign: "center", background: "var(--surface-2)", borderRadius: "var(--r-md)", border: "1px dashed var(--line)" }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-3)" }}>Contact the captain for UPI details.</p>
          </div>
        )}
        <button disabled={claiming} onClick={() => void claimPaid()}
          className="btn btn--primary btn--block btn--lg"
          style={{ background: "var(--green)", borderColor: "var(--green)" }}>
          {claiming ? "Saving…" : "✅ I Have Paid — Notify Captain"}
        </button>
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-4)", margin: 0 }}>Captain will verify and confirm your spot</p>
      </div>
    );
  }

  return (
    <button disabled={state === "loading"} onClick={() => void handlePay()}
      className="btn btn--primary btn--block btn--lg"
      style={{ opacity: state === "loading" ? 0.7 : 1, fontSize: 16, minHeight: 56, position: "relative" }}>
      {state === "loading" ? (
        <>
          <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
          Processing…
        </>
      ) : "💰 Pay & Confirm Spot"}
    </button>
  );
}
