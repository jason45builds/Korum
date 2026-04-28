"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { PaymentButton } from "@/components/payment/PaymentButton";
import { PaymentStatus } from "@/components/payment/PaymentStatus";
import { PaymentSummary } from "@/components/payment/PaymentSummary";
import { AuthPanel } from "@/components/shared/AuthPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { Loader } from "@/components/shared/Loader";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";

function MatchPaymentContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("matchId");
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { activeMatch, loading } = useMatch(matchId);

  if (!matchId) {
    return (
      <main>
        <EmptyState
          icon="🔗"
          title="Missing match ID"
          description="Open this page with a valid matchId query parameter."
        />
      </main>
    );
  }

  if (loading && !activeMatch) {
    return <main><Loader label="Loading payment details…" /></main>;
  }

  if (!activeMatch) {
    return (
      <main>
        <EmptyState
          icon="🔍"
          title="Match not found"
          description="Try reopening the payment link from your dashboard."
        />
      </main>
    );
  }

  if (!authLoading && !isAuthenticated) {
    return (
      <main>
        <div className="page-shell">
          <section className="hero-panel animate-in">
            <p className="eyebrow">Payment</p>
            <h1 className="title-lg">{activeMatch.title}</h1>
          </section>
          <AuthPanel
            title="Sign in to pay"
            description="Payment confirmation is attached to your verified Korum account."
          />
        </div>
      </main>
    );
  }

  const me        = activeMatch.participants.find((p) => p.userId === profile?.id);
  const isCaptain  = activeMatch.captainId === profile?.id;
  const alreadyPaid = me && ["CONFIRMED", "LOCKED"].includes(me.status);

  return (
    <main>
      <div className="page-shell">
        <section className="hero-panel animate-in">
          <p className="eyebrow">Payment</p>
          <h1 className="title-lg">{activeMatch.title}</h1>
          <p className="muted" style={{ marginTop: "0.4rem", fontSize: "0.9rem" }}>
            Payment confirmation turns your RSVP into a protected squad slot.
          </p>
        </section>

        <div className="grid grid-2">
          <PaymentSummary match={activeMatch} />
          <PaymentStatus paymentStatus={me?.paymentStatus} participantStatus={me?.status} />
        </div>

        <section className="panel animate-in" style={{ display: "grid", gap: "1rem" }}>
          <div>
            <p className="eyebrow">Complete Payment</p>
            <h3 className="title-md">
              {me && ["CONFIRMED", "LOCKED"].includes(me.status)
                ? "You're already confirmed ✅"
                : "Pay to lock your spot"}
            </h3>
          </div>
          {alreadyPaid ? (
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              Your payment is complete and your squad slot is secured. ✅
            </p>
          ) : isCaptain ? (
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              You&apos;re the captain — you don&apos;t pay via this screen. Manage the match from your captain panel.
            </p>
          ) : !me ? (
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              You haven&apos;t joined this match yet. Open the match link to RSVP first.
            </p>
          ) : (
            <PaymentButton matchId={activeMatch.id} profile={profile} />
          )}
        </section>
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
