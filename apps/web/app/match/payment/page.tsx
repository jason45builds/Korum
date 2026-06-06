"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { PaymentButton } from "@/components/payment/PaymentButton";
import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
};

function MatchPaymentContent() {
  const searchParams = useSearchParams();
  const matchId      = searchParams.get("matchId");
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { activeMatch, loading } = useMatch(matchId);

  if (!matchId) {
    return (
      <main>
        <div className="page" style={{ textAlign: "center", paddingTop: 64 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔗</div>
          <h2 className="t-h2">Missing match ID</h2>
          <p className="t-body" style={{ color: "var(--text-3)", marginTop: 8 }}>Open this page via the match link.</p>
        </div>
      </main>
    );
  }

  if (loading && !activeMatch) return <main><Loader label="Loading payment details…" /></main>;

  if (!activeMatch) {
    return (
      <main>
        <div className="page" style={{ textAlign: "center", paddingTop: 64 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
          <h2 className="t-h2">Match not found</h2>
          <p className="t-body" style={{ color: "var(--text-3)", marginTop: 8 }}>Try reopening the payment link from your dashboard.</p>
        </div>
      </main>
    );
  }

  if (!authLoading && !isAuthenticated) {
    return (
      <main>
        <div className="page">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <Link href={`/match/${activeMatch.id}`}>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, padding: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                Match
              </button>
            </Link>
          </div>
          <div>
            <p className="t-label" style={{ color: "var(--blue)", marginBottom: 4 }}>Payment</p>
            <h1 className="t-h2">{activeMatch.title}</h1>
          </div>
          <AuthPanel title="Sign in to pay" description="Payment confirmation is linked to your Korum account." />
        </div>
      </main>
    );
  }

  const me          = activeMatch.participants.find(p => p.userId === profile?.id);
  const isCaptain   = activeMatch.captainId === profile?.id;
  const alreadyPaid = me && ["CONFIRMED","LOCKED"].includes(me.status);

  const confirmed       = activeMatch.participants.filter(p => ["CONFIRMED","LOCKED"].includes(p.status)).length;
  const totalTarget     = activeMatch.squadSize * activeMatch.pricePerPlayer;
  const collected       = confirmed * activeMatch.pricePerPlayer;
  const pct             = totalTarget > 0 ? Math.min((collected / totalTarget) * 100, 100) : 0;

  return (
    <main>
      <div className="page">

        {/* Back + title */}
        <div>
          <Link href={`/match/${activeMatch.id}`}>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, padding: "0 0 8px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              Back to match
            </button>
          </Link>
          <p className="t-label" style={{ color: "var(--blue)", marginBottom: 4 }}>Payment</p>
          <h1 className="t-h2">{activeMatch.title}</h1>
          {activeMatch.startsAt && <p className="t-caption" style={{ marginTop: 4 }}>📅 {fmtDate(activeMatch.startsAt)}</p>}
          {activeMatch.venueName && <p className="t-caption" style={{ marginTop: 2 }}>📍 {activeMatch.venueName}</p>}
        </div>

        {/* Payment snapshot */}
        <div className="card card-pad animate-in">
          <p className="t-label" style={{ marginBottom: 12 }}>Squad payment progress</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 28, color: "var(--blue)" }}>
              {fmtCurrency(activeMatch.pricePerPlayer)}
            </span>
            <span className="t-caption">per player</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>
            <span>Collected: <strong style={{ color: "var(--green)" }}>{fmtCurrency(collected)}</strong></span>
            <span>Target: {fmtCurrency(totalTarget)}</span>
          </div>
          <div className="progress">
            <div className="progress__fill" style={{ width: `${pct}%`, background: pct >= 100 ? "var(--green)" : "var(--blue)" }} />
          </div>
          <div className="stats-strip" style={{ marginTop: 12 }}>
            <div className="stats-strip__item">
              <span className="stats-strip__num" style={{ color: "var(--green)", fontSize: 20 }}>{confirmed}</span>
              <span className="stats-strip__label">Confirmed</span>
            </div>
            <div className="stats-strip__item">
              <span className="stats-strip__num" style={{ color: "var(--amber)", fontSize: 20 }}>{activeMatch.participants.length - confirmed}</span>
              <span className="stats-strip__label">Pending</span>
            </div>
            <div className="stats-strip__item">
              <span className="stats-strip__num" style={{ fontSize: 20 }}>{activeMatch.squadSize}</span>
              <span className="stats-strip__label">Squad size</span>
            </div>
          </div>
        </div>

        {/* Your status */}
        <div className="card card-pad animate-in">
          <p className="t-label" style={{ marginBottom: 12 }}>Your status</p>
          {me ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>{alreadyPaid ? "✅" : me.status === "PAYMENT_PENDING" ? "⏳" : "💳"}</span>
              <div>
                <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: alreadyPaid ? "var(--green)" : "var(--amber)" }}>
                  {alreadyPaid ? "Confirmed" : "Payment pending"}
                </p>
                <p className="t-caption" style={{ marginTop: 2 }}>
                  {alreadyPaid ? "Your squad slot is secured. ✅" : "Pay to lock your spot before the deadline."}
                </p>
              </div>
            </div>
          ) : (
            <p className="t-body" style={{ color: "var(--text-3)" }}>You haven&apos;t joined this match yet.</p>
          )}
        </div>

        {/* Payment action */}
        <div className="card card-pad animate-in">
          <p className="t-label" style={{ marginBottom: 12 }}>
            {alreadyPaid ? "Payment complete" : "Complete payment"}
          </p>

          {alreadyPaid ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>✅</div>
              <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--green)" }}>All done!</p>
              <p className="t-caption" style={{ marginTop: 4 }}>Your payment is confirmed and your slot is secured.</p>
            </div>
          ) : isCaptain ? (
            <p className="t-body" style={{ color: "var(--text-3)" }}>
              You&apos;re the captain — manage payments from your captain panel.
            </p>
          ) : !me ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p className="t-body" style={{ color: "var(--text-3)" }}>You haven&apos;t joined this match yet.</p>
              <Link href={`/match/${activeMatch.id}`}>
                <button className="btn btn--primary btn--block">← Go to Match</button>
              </Link>
            </div>
          ) : (
            <PaymentButton matchId={activeMatch.id} profile={profile} />
          )}
        </div>

        {/* Payment deadline notice */}
        {activeMatch.paymentDueAt && !alreadyPaid && (
          <div style={{ padding: "10px 14px", background: "var(--amber-soft)", border: "1px solid var(--amber-border)", borderRadius: "var(--r-md)", fontSize: 13, color: "#92400e" }}>
            ⏰ Payment deadline: <strong>{fmtDate(activeMatch.paymentDueAt)}</strong>
            <br />Unpaid players lose their slot after this time.
          </div>
        )}

      </div>
    </main>
  );
}

export default function MatchPaymentPage() {
  return (
    <Suspense fallback={<main><Loader label="Loading payment screen…" /></main>}>
      <MatchPaymentContent />
    </Suspense>
  );
}
