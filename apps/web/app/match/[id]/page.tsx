"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { MatchHeader } from "@/components/match/MatchHeader";
import { MatchStatus } from "@/components/match/MatchStatus";
import { PlayerList } from "@/components/match/PlayerList";
import { PaymentButton } from "@/components/payment/PaymentButton";
import { PaymentStatus } from "@/components/payment/PaymentStatus";
import { PaymentSummary } from "@/components/payment/PaymentSummary";
import { AuthPanel } from "@/components/shared/AuthPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";

export default function MatchPage() {
  const params = useParams<{ id: string }>();
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { activeMatch, loading: matchLoading } = useMatch(params.id);

  // Loading match data
  if (matchLoading && !activeMatch) {
    return <main><Loader label="Loading match…" /></main>;
  }

  if (!activeMatch) {
    return (
      <main>
        <EmptyState
          icon="🔍"
          title="Match not found"
          description="Check the link or join code and try again."
          action={<Link href="/match/join"><Button>Join via code</Button></Link>}
        />
      </main>
    );
  }

  // Auth still loading — show match header while waiting
  if (authLoading) {
    return (
      <main>
        <div className="page-shell">
          <MatchHeader match={activeMatch} />
          <Loader label="Checking your session…" />
        </div>
      </main>
    );
  }

  // Not signed in
  if (!isAuthenticated) {
    return (
      <main>
        <div className="page-shell">
          <MatchHeader match={activeMatch} />
          <AuthPanel title="Sign in to join this match" />
        </div>
      </main>
    );
  }

  const me = activeMatch.participants.find((p) => p.userId === profile?.id);
  const isConfirmed = me && ["CONFIRMED", "LOCKED"].includes(me.status);

  return (
    <main>
      <div className="page-shell">
        <MatchHeader match={activeMatch} />

        <div className="grid grid-2">
          <MatchStatus match={activeMatch} />
          <PaymentSummary match={activeMatch} />
        </div>

        <div className="grid grid-2">
          <PaymentStatus paymentStatus={me?.paymentStatus} participantStatus={me?.status} />

          <section className="panel animate-in" style={{ display: "grid", gap: "1rem" }}>
            <div>
              <p className="eyebrow">Next Step</p>
              <h3 className="title-md">
                {isConfirmed ? "You're in! ✅" : me ? "Complete payment" : "Join this match"}
              </h3>
            </div>
            {me ? (
              isConfirmed ? (
                <p className="muted" style={{ fontSize: "0.9rem" }}>
                  Your spot is confirmed. Keep an eye on match updates.
                </p>
              ) : (
                <PaymentButton matchId={activeMatch.id} profile={profile} />
              )
            ) : (
              <div className="cluster">
                <Link href={`/match/join?matchId=${activeMatch.id}`} style={{ flex: 1 }}>
                  <Button block>Join Match</Button>
                </Link>
                <Link href={`/match/payment?matchId=${activeMatch.id}`} style={{ flex: 1 }}>
                  <Button variant="secondary" block>Pay Directly</Button>
                </Link>
              </div>
            )}
            <Link href={`/match/room?matchId=${activeMatch.id}`}
              style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--primary)", fontFamily: "var(--font-display)" }}>
              Open readiness room →
            </Link>
          </section>
        </div>

        <PlayerList participants={activeMatch.participants} />
      </div>
    </main>
  );
}
