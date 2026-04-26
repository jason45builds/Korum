"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { useAuth } from "@/hooks/useAuth";
import { joinMatch } from "@/services/api/match";

// Bug fix: old page showed a raw form with 3 fields even when matchId was
// in the URL. Now: if params exist + user is authed → auto-join immediately.
// Only show manual form when arriving with nothing.
function JoinMatchContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const joinCode    = searchParams.get("joinCode") ?? "";
  const matchId     = searchParams.get("matchId") ?? "";
  const inviteToken = searchParams.get("invite") ?? "";

  const [manualCode, setManualCode] = useState("");
  const [message, setMessage]       = useState<{ text: string; error: boolean } | null>(null);
  const [submitting, setSubmitting]  = useState(false);
  const attemptedRef = useRef(false);

  const hasParams = !!(joinCode || matchId || inviteToken);

  const doJoin = async (code?: string) => {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await joinMatch({
        matchId:     matchId || undefined,
        joinCode:    (code ?? joinCode) || undefined,
        inviteToken: inviteToken || undefined,
      });
      // Go straight to payment if there's a price, otherwise match detail
      router.push(`/match/${String(res.match.id)}`);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not join.", error: true });
      setSubmitting(false);
    }
  };

  // Auto-join once when URL params exist and auth resolves
  useEffect(() => {
    if (!hasParams || authLoading || !isAuthenticated || attemptedRef.current) return;
    attemptedRef.current = true;
    void doJoin();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasParams, authLoading, isAuthenticated]);

  if (authLoading) return <main><Loader label="Loading…" /></main>;

  // Auto-joining — show spinner, no form
  if (hasParams && submitting && !message) {
    return <main><Loader label="Joining match…" /></main>;
  }

  // Auto-join failed — show error + retry
  if (hasParams && message?.error) {
    return (
      <main>
        <div className="page" style={{ paddingTop: 48, textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
          <h2 className="t-h2" style={{ marginBottom: 8 }}>Couldn&apos;t join</h2>
          <p className="t-body" style={{ color: "var(--text-3)", marginBottom: 24 }}>{message.text}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 300, margin: "0 auto" }}>
            <button className="btn btn--primary btn--block" onClick={() => { attemptedRef.current = false; void doJoin(); }}>
              Try Again
            </button>
            <button className="btn btn--ghost btn--block" onClick={() => router.push("/dashboard")}>
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Need auth to join
  if (!isAuthenticated) {
    return (
      <main>
        <div className="page">
          <div style={{ paddingTop: 8, paddingBottom: 4 }}>
            <h1 className="t-h2" style={{ marginBottom: 6 }}>Join a Match</h1>
            <p className="t-body" style={{ color: "var(--text-3)" }}>Sign in first to claim your spot.</p>
          </div>
          <AuthPanel />
        </div>
      </main>
    );
  }

  // Manual entry — no params in URL
  return (
    <main>
      <div className="page">
        <div style={{ paddingTop: 8 }}>
          <h1 className="t-h2" style={{ marginBottom: 6 }}>Join a Match</h1>
          <p className="t-body" style={{ color: "var(--text-3)" }}>Enter the code your captain shared.</p>
        </div>

        <div className="card card-pad">
          <div className="form-stack">
            <div className="field">
              <label className="field-label">Join code</label>
              <input
                className="input"
                placeholder="e.g. ABC123"
                value={manualCode}
                autoFocus
                style={{ letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, textAlign: "center", height: 60 }}
                onChange={e => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === "Enter" && manualCode.length >= 4) void doJoin(manualCode); }}
              />
            </div>

            {message && (
              <p className={`msg${message.error ? " error" : " success"}`}>{message.text}</p>
            )}

            <button
              className="btn btn--primary btn--block"
              style={{ minHeight: 52 }}
              disabled={submitting || manualCode.length < 4}
              onClick={() => void doJoin(manualCode)}>
              {submitting ? "Joining…" : "Join Match"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function JoinMatchPage() {
  return (
    <Suspense fallback={<main><Loader label="Loading…" /></main>}>
      <JoinMatchContent />
    </Suspense>
  );
}
