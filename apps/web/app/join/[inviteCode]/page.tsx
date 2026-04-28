"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

type TeamPreview = {
  id: string;
  name: string;
  sport: string;
  city: string;
  inviteCode: string;
  captainName: string;
  memberCount: number;
  isAlreadyMember: boolean;
};

const ini = (n: string) =>
  (n ?? "?").split(" ").map((x: string) => x[0]).join("").toUpperCase().slice(0, 2);

export default function JoinTeamPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const router  = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [team,    setTeam]    = useState<TeamPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined,  setJoined]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Load team preview — works even before sign-in
  useEffect(() => {
    if (!inviteCode) return;
    void fetch(`/api/team/preview?inviteCode=${inviteCode}`, { credentials: "same-origin" })
      .then(r => r.json())
      .then((d: { team?: TeamPreview; error?: string }) => {
        if (d.error) setError(d.error);
        else if (d.team) setTeam(d.team);
      })
      .catch(() => setError("Could not load team."))
      .finally(() => setLoading(false));
  }, [inviteCode]);

  // Auto-navigate to team page if already a member
  useEffect(() => {
    if (team?.isAlreadyMember && isAuthenticated) {
      router.replace(`/team/${team.id}`);
    }
  }, [team, isAuthenticated, router]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      router.push(`/auth?redirect=/join/${inviteCode}`);
      return;
    }
    setJoining(true);
    setError(null);
    try {
      const res  = await fetch("/api/team/join", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ inviteCode }),
      });
      const data = await res.json() as { team?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not join team.");
      setJoined(true);
      setTimeout(() => router.push(`/team/${data.team!.id}`), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join.");
    } finally {
      setJoining(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading || authLoading) {
    return (
      <main>
        <div className="page" style={{ alignItems: "center", paddingTop: 60 }}>
          <div style={{ width: 36, height: 36, border: "3px solid var(--line)", borderTopColor: "var(--blue)", borderRadius: "50%", animation: "spin 0.75s linear infinite" }} />
          <p className="t-caption">Loading team…</p>
        </div>
      </main>
    );
  }

  // ── Team not found ────────────────────────────────────────────────────────
  if (error || !team) {
    return (
      <main>
        <div className="page" style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>😕</div>
          <h2 className="t-h2" style={{ marginBottom: 8 }}>Invite not found</h2>
          <p className="t-body" style={{ color: "var(--text-3)", marginBottom: 24 }}>
            {error ?? "This invite link may have expired or been removed."}
          </p>
          <Link href="/teams">
            <button className="btn btn--ghost">Browse teams</button>
          </Link>
        </div>
      </main>
    );
  }

  // ── Joined success ────────────────────────────────────────────────────────
  if (joined) {
    return (
      <main>
        <div className="page" style={{ alignItems: "center", textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h2 className="t-h2" style={{ marginBottom: 8 }}>You&apos;re in!</h2>
          <p className="t-body" style={{ color: "var(--text-3)" }}>
            Welcome to <strong>{team.name}</strong>. Taking you to the team page…
          </p>
        </div>
      </main>
    );
  }

  // ── Main invite view ──────────────────────────────────────────────────────
  return (
    <main>
      <div className="page">

        {/* Team card */}
        <div className="card" style={{ overflow: "hidden" }}>
          {/* Accent bar */}
          <div style={{ height: 5, background: "linear-gradient(90deg, var(--blue), #60A5FA)" }} />

          <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
            {/* Avatar */}
            <div style={{
              width: 72, height: 72, borderRadius: "var(--r-xl)",
              background: "var(--blue-soft)", border: "2px solid var(--blue-border)",
              display: "grid", placeItems: "center",
              fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 24, color: "var(--blue)",
            }}>
              {ini(team.name)}
            </div>

            {/* Team name + meta */}
            <div>
              <h1 className="t-h1" style={{ marginBottom: 6 }}>{team.name}</h1>
              <p className="t-body" style={{ color: "var(--text-3)" }}>
                {team.sport} · {team.city}
              </p>
            </div>

            {/* Stats strip */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", marginTop: 4 }}>
              <div style={{ padding: "12px", background: "var(--surface-2)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
                <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 24, color: "var(--blue)" }}>
                  {team.memberCount}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 11, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Players
                </p>
              </div>
              <div style={{ padding: "12px", background: "var(--surface-2)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
                <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 24, color: "var(--text-2)" }}>
                  {ini(team.captainName)}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 11, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Captain
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What happens when you join */}
        <div className="card" style={{ overflow: "hidden" }}>
          {[
            { icon: "📋", text: "Get notified when the captain creates matches" },
            { icon: "💰", text: "Pay your match fee directly in the app" },
            { icon: "🔒", text: "Your spot is locked once you pay" },
            { icon: "🧠", text: "Access the strategy room before every match" },
          ].map(({ icon, text }, i, arr) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none" }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
              <p style={{ margin: 0, fontSize: 14, color: "var(--text-2)", lineHeight: 1.4 }}>{text}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => void handleJoin()}
            disabled={joining}
            className="btn btn--primary btn--block btn--lg"
            style={{ fontSize: 16 }}>
            {joining ? (
              <>
                <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
                Joining…
              </>
            ) : isAuthenticated ? (
              `✅ Join ${team.name}`
            ) : (
              "Sign in to Join"
            )}
          </button>

          <Link href="/" style={{ width: "100%" }}>
            <button className="btn btn--ghost btn--block">
              ❌ Decline
            </button>
          </Link>
        </div>

        {/* Not signed in nudge */}
        {!isAuthenticated && (
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-4)" }}>
            You&apos;ll be asked to sign in first, then brought right back here to join.
          </p>
        )}

      </div>
    </main>
  );
}
