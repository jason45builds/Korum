"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { MatchHeader } from "@/components/match/MatchHeader";
import { MatchStatus } from "@/components/match/MatchStatus";
import { PlayerList } from "@/components/match/PlayerList";
import { AuthPanel } from "@/components/shared/AuthPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useInvite } from "@/hooks/useInvite";
import { useMatch } from "@/hooks/useMatch";
import { buildMatchJoinLink } from "@/lib/helpers";

function MatchRoomContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("matchId");
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { activeMatch, loading, loadMatch, lockMatch, updateMatch } = useMatch(matchId);
  const { sendInvite, loading: inviteLoading } = useInvite(matchId ?? undefined);
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  if (!matchId) {
    return (
      <main>
        <EmptyState
          title="Missing match ID"
          description="Open the room with a `matchId` query parameter."
        />
      </main>
    );
  }

  if (loading && !activeMatch) {
    return (
      <main>
        <Loader label="Loading readiness room..." />
      </main>
    );
  }

  if (!activeMatch) {
    return (
      <main>
        <EmptyState title="Room unavailable" description="That match could not be loaded." />
      </main>
    );
  }

  if (!authLoading && !isAuthenticated) {
    return (
      <main>
        <AuthPanel title="Sign in to access the readiness room" />
      </main>
    );
  }

  const isCaptain = activeMatch.captainId === profile?.id;

  const handleInvite = async () => {
    try {
      const response = await sendInvite({
        invitedPhone: invitePhone,
        invitedName: inviteName || null,
      });
      setMessage(`Invite ready: ${response.shareLink}`);
      setInvitePhone("");
      setInviteName("");
      await loadMatch({ matchId });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send invite.");
    }
  };

  const handleLock = async () => {
    try {
      await lockMatch(matchId);
      await loadMatch({ matchId });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not lock squad.");
    }
  };

  const handleReady = async () => {
    try {
      await updateMatch({ matchId, nextState: "READY" });
      await loadMatch({ matchId });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not move match to ready.");
    }
  };

  return (
    <main>
      <div className="page-shell">
        <MatchHeader match={activeMatch} />
        <div className="grid grid-2">
          <MatchStatus match={activeMatch} />
          <Card title="Room actions">
            <div className="form-grid">
              <div className="metric">
                <div className="eyebrow">Share link</div>
                <strong>{buildMatchJoinLink(activeMatch.id, activeMatch.joinCode)}</strong>
              </div>

              {isCaptain ? (
                <>
                  <label className="label">
                    Invite player phone
                    <input
                      className="input"
                      value={invitePhone}
                      onChange={(event) => setInvitePhone(event.target.value)}
                    />
                  </label>
                  <label className="label">
                    Invite player name
                    <input
                      className="input"
                      value={inviteName}
                      onChange={(event) => setInviteName(event.target.value)}
                    />
                  </label>
                  <Button
                    variant="secondary"
                    onClick={() => void handleInvite()}
                    loading={inviteLoading}
                    block
                  >
                    Send Invite
                  </Button>
                  {activeMatch.status === "PAYMENT_PENDING" ? (
                    <Button onClick={() => void handleLock()} block>
                      Lock Paid Squad
                    </Button>
                  ) : null}
                  {activeMatch.status === "LOCKED" ? (
                    <Button variant="ghost" onClick={() => void handleReady()} block>
                      Mark Match Ready
                    </Button>
                  ) : null}
                </>
              ) : (
                <p className="muted">
                  Captains can invite players and advance the match lifecycle from this room.
                </p>
              )}

              {message ? (
                <p className="muted" style={{ margin: 0 }}>
                  {message}
                </p>
              ) : null}
            </div>
          </Card>
        </div>

        <PlayerList participants={activeMatch.participants} />
      </div>
    </main>
  );
}

export default function MatchRoomPage() {
  return (
    <Suspense fallback={<main><div className="panel">Loading readiness room...</div></main>}>
      <MatchRoomContent />
    </Suspense>
  );
}
