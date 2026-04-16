"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { joinMatch } from "@/services/api/match";

function JoinMatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [joinCode,    setJoinCode]    = useState(searchParams.get("joinCode") ?? "");
  const [matchId,     setMatchId]     = useState(searchParams.get("matchId") ?? "");
  const [inviteToken, setInviteToken] = useState(searchParams.get("invite") ?? "");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [autoAttempted, setAutoAttempted] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await joinMatch({
        matchId:     matchId     || undefined,
        joinCode:    joinCode    || undefined,
        inviteToken: inviteToken || undefined,
      });
      router.push(`/match/${String(response.match.id)}`);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not join the match.", error: true });
      setSubmitting(false);
    }
  };

  // Auto-join once when params exist and auth resolves
  useEffect(() => {
    if (!authLoading && isAuthenticated && !autoAttempted && (inviteToken || matchId || joinCode)) {
      setAutoAttempted(true);
      void submit();
    }
  }, [authLoading, isAuthenticated]);

  // Auth still loading
  if (authLoading) return <main><Loader label="Loading…" /></main>;

  // Auto-joining in progress
  if (submitting && !message) return <main><Loader label="Joining match…" /></main>;

  return (
    <main>
      <div className="page-shell">
        <section className="hero-panel animate-in">
          <p className="eyebrow">Join Match</p>
          <h1 className="title-lg" style={{ marginTop: "0.4rem" }}>Get on the squad list.</h1>
          <p className="muted" style={{ marginTop: "0.4rem", fontSize: "0.9rem" }}>
            Use a link, invite token, or join code. Your slot is provisional until payment clears.
          </p>
        </section>

        {!isAuthenticated ? (
          <AuthPanel
            title="Sign in to join"
            description="OTP sign-in required before Korum can attach you to a squad."
          />
        ) : (
          <Card eyebrow="Join Details" title="Enter match info">
            <div className="form-grid">
              <label className="label">
                Match ID
                <input className="input" placeholder="Leave blank if using a join code"
                  value={matchId} onChange={(e) => setMatchId(e.target.value)} />
              </label>
              <label className="label">
                Join code
                <input className="input" placeholder="e.g. ABC123"
                  value={joinCode}
                  style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
              </label>
              <label className="label">
                Invite token
                <input className="input" placeholder="From a direct invite link"
                  value={inviteToken} onChange={(e) => setInviteToken(e.target.value)} />
              </label>
              <Button onClick={() => void submit()} loading={submitting} block>
                Join Match
              </Button>
              {message && (
                <p className={`message-strip${message.error ? " error" : " success"}`} role={message.error ? "alert" : "status"}>
                  {message.text}
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}

export default function JoinMatchPage() {
  return (
    <Suspense fallback={<main><Loader label="Loading join flow…" /></main>}>
      <JoinMatchContent />
    </Suspense>
  );
}
