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
import { buildMatchJoinLink, copyToClipboard } from "@/lib/helpers";

function MatchRoomContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("matchId");
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { activeMatch, loading, loadMatch, lockMatch, updateMatch } = useMatch(matchId);
  const { sendInvite, loading: inviteLoading } = useInvite(matchId ?? undefined);
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  if (!matchId) {
    return (
      <main>
        <EmptyState icon="🔗" title="Missing match ID" description="Open the room with a matchId query parameter." />
      </main>
    );
  }

  if (loading && !activeMatch) {
    return <main><Loader label="Loading readiness room…" /></main>;
  }

  if (!activeMatch) {
    return (
      <main>
        <EmptyState icon="🏟️" title="Room unavailable" description="That match could not be loaded." />
      </main>
    );
  }

  if (!authLoading && !isAuthenticated) {
    return (
      <main>
        <div className="page-shell">
          <MatchHeader match={activeMatch} />
          <AuthPanel title="Sign in to access the readiness room" />
        </div>
      </main>
    );
  }

  const isCaptain = activeMatch.captainId === profile?.id;
  const shareLink = buildMatchJoinLink(activeMatch.id, activeMatch.joinCode);

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(shareLink);
    if (ok) { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }
  };

  const handleInvite = async () => {
    if (!invitePhone.trim()) {
      setMessage({ text: "Enter a phone number to invite.", error: true });
      return;
    }
    try {
      const response = await sendInvite({ invitedPhone: invitePhone.trim(), invitedName: inviteName.trim() || null });
      setMessage({ text: `Invite link ready — share it with the player.`, error: false });
      await copyToClipboard(response.shareLink);
      setInvitePhone("");
      setInviteName("");
      await loadMatch({ matchId });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Could not send invite.", error: true });
    }
  };

  const handleLock = async () => {
    try {
      await lockMatch(matchId);
      setMessage({ text: "Squad locked! Only paid players are in.", error: false });
      await loadMatch({ matchId });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Could not lock squad.", error: true });
    }
  };

  const handleReady = async () => {
    try {
      await updateMatch({ matchId, nextState: "READY" });
      setMessage({ text: "Match marked as ready!", error: false });
      await loadMatch({ matchId });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Could not mark match as ready.", error: true });
    }
  };

  return (
    <main>
      <div className="page-shell">
        <MatchHeader match={activeMatch} />

        <div className="grid grid-2">
          <MatchStatus match={activeMatch} />

          <Card eyebrow="Captain Tools" title="Room Actions">
            <div className="form-grid">
              {/* Share link */}
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <div className="label">Share link</div>
                <div style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-muted)",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  wordBreak: "break-all",
                  border: "1px solid var(--line)",
                }}>
                  {shareLink}
                </div>
                <Button variant="secondary" size="sm" onClick={() => void handleCopyLink()}>
                  {linkCopied ? "✓ Copied!" : "Copy Share Link"}
                </Button>
              </div>

              <hr className="divider" />

              {isCaptain ? (
                <>
                  <label className="label">
                    Player phone
                    <input
                      className="input"
                      type="tel"
                      inputMode="tel"
                      placeholder="+91 98765 43210"
                      value={invitePhone}
                      onChange={(e) => setInvitePhone(e.target.value)}
                    />
                  </label>
                  <label className="label">
                    Player name <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(optional)</span>
                    <input
                      className="input"
                      placeholder="Arjun Sharma"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                    />
                  </label>
                  <Button variant="secondary" onClick={() => void handleInvite()} loading={inviteLoading} block>
                    Send Invite & Copy Link
                  </Button>

                  {activeMatch.status === "PAYMENT_PENDING" && (
                    <>
                      <hr className="divider" />
                      <Button onClick={() => void handleLock()} block>
                        🔒 Lock Paid Squad
                      </Button>
                    </>
                  )}

                  {activeMatch.status === "LOCKED" && (
                    <Button variant="ghost" onClick={() => void handleReady()} block>
                      ✅ Mark Match Ready
                    </Button>
                  )}
                </>
              ) : (
                <p className="muted" style={{ fontSize: "0.88rem" }}>
                  Only the captain can invite players and advance the match lifecycle from here.
                </p>
              )}

              {message && (
                <p
                  className={`message-strip${message.error ? " error" : " success"}`}
                  role={message.error ? "alert" : "status"}
                >
                  {message.text}
                </p>
              )}
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
    <Suspense fallback={<main><Loader label="Loading readiness room…" /></main>}>
      <MatchRoomContent />
    </Suspense>
  );
}
