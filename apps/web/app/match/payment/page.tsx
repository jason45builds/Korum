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
          title="Missing match ID"
          description="Open this page with a valid `matchId` query parameter."
        />
      </main>
    );
  }

  if (loading && !activeMatch) {
    return (
      <main>
        <Loader label="Loading payment details..." />
      </main>
    );
  }

  if (!activeMatch) {
    return (
      <main>
        <EmptyState
          title="Match not found"
          description="Try reopening the payment link from the dashboard or match page."
        />
      </main>
    );
  }

  if (!authLoading && !isAuthenticated) {
    return (
      <main>
        <AuthPanel
          title="Sign in to pay"
          description="Payment confirmation is attached to your verified Korum account."
        />
      </main>
    );
  }

  const me = activeMatch.participants.find((participant) => participant.userId === profile?.id);

  return (
    <main>
      <div className="page-shell">
        <section className="hero-panel">
          <p className="eyebrow">Payment</p>
          <h1 className="title-lg">{activeMatch.title}</h1>
          <p className="muted">
            Payment confirmation turns your RSVP into a protected squad slot.
          </p>
        </section>

        <div className="grid grid-2">
          <PaymentSummary match={activeMatch} />
          <PaymentStatus paymentStatus={me?.paymentStatus} participantStatus={me?.status} />
        </div>

        <section className="panel">
          <PaymentButton matchId={activeMatch.id} profile={profile} />
        </section>
      </div>
    </main>
  );
}

export default function MatchPaymentPage() {
  return (
    <Suspense fallback={<main><div className="panel">Loading payment screen...</div></main>}>
      <MatchPaymentContent />
    </Suspense>
  );
}
