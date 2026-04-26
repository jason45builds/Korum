"use client";

import { useState } from "react";
import type { UserProfile } from "@korum/types/user";

type OrderResponse =
  | { mode: "razorpay"; paymentId: string; orderId: string; amount: number; currency: string; keyId: string; matchId: string; matchTitle: string }
  | { mode: "manual_upi"; amount: number; captainName: string; upiId: string | null; matchTitle: string }
  | { mode: "free" };

export function PaymentButton({
  matchId,
  profile,
  onComplete,
}: {
  matchId: string;
  profile?: UserProfile | null;
  onComplete?: () => void;
}) {
  const [state, setState]     = useState<"idle" | "loading" | "upi" | "claimed" | "done" | "error">("idle");
  const [order, setOrder]     = useState<OrderResponse | null>(null);
  const [errMsg, setErrMsg]   = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);
  const [claiming, setClaiming] = useState(false);

  const loadScript = (): Promise<boolean> =>
    new Promise(resolve => {
      if (typeof window === "undefined") return resolve(false);
      if (window.Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const handlePay = async () => {
    setState("loading");
    setErrMsg(null);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ matchId }),
      });
      const data = await res.json() as OrderResponse & { error?: string };
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Order creation failed");

      if (data.mode === "free") {
        setState("done");
        onComplete?.();
        return;
      }

      setOrder(data);

      if (data.mode === "manual_upi") {
        setState("upi");
        return;
      }

      // Razorpay mode
      const ready = await loadScript();
      if (!ready || !window.Razorpay) {
        // Fallback to UPI if script fails
        setState("upi");
        return;
      }

      const rp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Korum",
        description: data.matchTitle,
        order_id: data.orderId,
        prefill: {
          name: profile?.fullName ?? profile?.displayName ?? "",
          contact: profile?.phone ?? "",
        },
        theme: { color: "#2563EB" },
        handler: async (response: Record<string, string>) => {
          try {
            const vRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({
                paymentId: data.paymentId,
                matchId: data.matchId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            if (!vRes.ok) throw new Error("Verification failed");
            setState("done");
            onComplete?.();
          } catch (e) {
            setState("error");
            setErrMsg(e instanceof Error ? e.message : "Payment verification failed");
          }
        },
        modal: {
          ondismiss: () => setState("idle"),
        },
      });
      rp.open();
      setState("idle"); // reset while modal is open

    } catch (e) {
      setState("error");
      setErrMsg(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const copyUpi = async (upi: string) => {
    try { await navigator.clipboard.writeText(upi); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* ignore */ }
  };

  const openUpiApp = (upi: string, amount: number) => {
    window.location.href = `upi://pay?pa=${encodeURIComponent(upi)}&am=${amount}&cu=INR&tn=Match+fee`;
  };

  const claimPaid = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      // Mark participant payment as pending captain review
      await fetch("/api/participants/claim-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ matchId }),
      });
      setState("claimed");
    } catch {
      setState("claimed"); // still show claimed even if API fails
    } finally {
      setClaiming(false);
    }
  };

  // ── Done state ──
  if (state === "done") {
    return (
      <div style={{ textAlign: "center", padding: "1.5rem", background: "var(--green-soft)", borderRadius: "var(--r-lg)", border: "1.5px solid var(--green-border)" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
        <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--green)" }}>
          You&apos;re confirmed!
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-3)" }}>Your spot is locked.</p>
      </div>
    );
  }

  // ── Claimed state ──
  if (state === "claimed") {
    return (
      <div style={{ textAlign: "center", padding: "1.5rem", background: "var(--amber-soft)", borderRadius: "var(--r-lg)", border: "1.5px solid var(--amber-border)" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
        <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--amber)" }}>
          Waiting for captain
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-3)" }}>Your payment is noted. Captain will confirm shortly.</p>
      </div>
    );
  }

  // ── Manual UPI state ──
  if (state === "upi" && order?.mode === "manual_upi") {
    const { amount, captainName, upiId } = order;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Amount */}
        <div style={{ textAlign: "center", padding: "1rem", background: "var(--green-soft)", borderRadius: "var(--r-md)", border: "1.5px solid var(--green-border)" }}>
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 32, color: "var(--green)" }}>₹{amount}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-3)" }}>Match fee</p>
        </div>

        {/* Captain UPI */}
        {upiId ? (
          <div style={{ padding: "1rem", background: "var(--surface-2)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Pay to</p>
            <p style={{ margin: "0 0 2px", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>{captainName}</p>
            <p style={{ margin: 0, fontFamily: "monospace", fontSize: 14, color: "var(--amber)" }}>{upiId}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => void copyUpi(upiId)}
                style={{ padding: "10px", borderRadius: "var(--r-sm)", border: "1.5px solid var(--line)", background: "var(--surface)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {copied ? "✓ Copied" : "Copy UPI"}
              </button>
              <button
                onClick={() => openUpiApp(upiId, amount)}
                style={{ padding: "10px", borderRadius: "var(--r-sm)", border: "none", background: "#F97316", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                Open UPI App
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: "1rem", textAlign: "center", background: "var(--surface-2)", borderRadius: "var(--r-md)", border: "1px dashed var(--line)" }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-3)" }}>
              Contact the captain for UPI details
            </p>
          </div>
        )}

        <button
          disabled={claiming}
          onClick={() => void claimPaid()}
          style={{ width: "100%", padding: "14px", border: "none", borderRadius: "var(--r-lg)", background: "var(--green)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, cursor: "pointer", opacity: claiming ? 0.6 : 1 }}>
          {claiming ? "Saving…" : "✅ I Have Paid"}
        </button>
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-4)", margin: 0 }}>
          Captain will verify and confirm your spot
        </p>
      </div>
    );
  }

  // ── Error state ──
  if (state === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ padding: "1rem", background: "var(--red-soft)", borderRadius: "var(--r-md)", border: "1px solid var(--red-border)" }}>
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--red)" }}>
            Payment failed
          </p>
          {errMsg && <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-3)" }}>{errMsg}</p>}
        </div>
        <button
          onClick={() => { setState("idle"); setErrMsg(null); }}
          style={{ padding: "12px", borderRadius: "var(--r-full)", border: "1.5px solid var(--line)", background: "var(--surface)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Try Again
        </button>
      </div>
    );
  }

  // ── Default: Pay button ──
  return (
    <button
      disabled={state === "loading"}
      onClick={() => void handlePay()}
      style={{ width: "100%", minHeight: 54, padding: "14px", border: "none", borderRadius: "var(--r-lg)", background: state === "loading" ? "var(--line)" : "var(--blue)", color: state === "loading" ? "var(--text-4)" : "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, cursor: state === "loading" ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 150ms" }}>
      {state === "loading" ? (
        <>
          <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid var(--text-4)", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
          Processing…
        </>
      ) : "💰 Pay & Confirm Spot"}
    </button>
  );
}
