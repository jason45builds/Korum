"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { MatchOverview } from "@/components/dashboard/MatchOverview";
import { TeamHeader } from "@/components/team/TeamHeader";
import { TeamMembers } from "@/components/team/TeamMembers";
import { TeamStats } from "@/components/team/TeamStats";
import { AuthPanel } from "@/components/shared/AuthPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";
import { getTeamDetails } from "@/services/api/team";
import type { MatchSummary } from "@korum/types/match";
import type { TeamDetails } from "@korum/types/team";

export default function TeamPage() {
  const params = useParams<{ id: string }>();
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { loadTeamMatches } = useMatch();
  const [team, setTeam]       = useState<TeamDetails | null>(null);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    Promise.all([getTeamDetails(params.id), loadTeamMatches(params.id)])
      .then(([tr, tm]) => { setTeam(tr.team); setMatches(tm); })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load team."))
      .finally(() => setLoading(false));
  }, [isAuthenticated, params.id]);

  if (!authLoading && !isAuthenticated) {
    return <main><div className="page-shell"><AuthPanel title="Sign in for team access" /></div></main>;
  }
  if (authLoading || loading) return <main><Loader label="Loading team…" /></main>;
  if (error) return <main><EmptyState icon="⚠️" title="Could not load team" description={error} /></main>;
  if (!team) return <main><EmptyState icon="🔍" title="Team not found" description="That team could not be loaded." /></main>;

  const isCaptain = team.members.some((m) => m.userId === profile?.id && m.role === "CAPTAIN");

  const shareInviteLink = () => {
    const link = `${window.location.origin}/join/${team.inviteCode}`;
    const text = `Join ${team.name} on Korum! 🏏\n\nWe use Korum to manage matches — RSVP, pay fees, and get your spot confirmed in seconds.\n\nJoin the squad 👉 ${link}`;
    if (navigator.share) {
      void navigator.share({ title: `Join ${team.name}`, text, url: link });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const copyInviteLink = async () => {
    const link = `${window.location.origin}/join/${team.inviteCode}`;
    await navigator.clipboard.writeText(link);
  };

  return (
    <main>
      <div className="page-shell">
        <TeamHeader team={team} />
        <TeamStats team={team} activeMatches={matches.length} />

        {/* Invite players — visible to captain and members */}
        <section className="card card-pad animate-in" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p className="t-label" style={{ marginBottom: 2 }}>Invite players</p>
              <p className="t-caption">Share the link — they tap Join, sign in, and they&apos;re in.</p>
            </div>
          </div>
          {/* Invite link display */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1, padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", fontSize: 13, color: "var(--text-3)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {typeof window !== "undefined" ? `${window.location.origin}/join/${team.inviteCode}` : `/join/${team.inviteCode}`}
            </div>
            <button
              onClick={() => void copyInviteLink()}
              style={{ flexShrink: 0, padding: "10px 14px", border: "1.5px solid var(--blue-border)", borderRadius: "var(--r-md)", background: "var(--blue-soft)", color: "var(--blue)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Copy
            </button>
          </div>
          {/* WhatsApp share */}
          <button
            onClick={shareInviteLink}
            style={{ width: "100%", minHeight: 48, border: "none", borderRadius: "var(--r-lg)", background: "#25D366", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Invite via WhatsApp
          </button>
        </section>

        {/* Captain quick actions */}
        {isCaptain && (
          <section className="panel animate-in" style={{ display: "grid", gap: "0.75rem" }}>
            <p className="eyebrow">Captain Actions</p>
            <div className="cluster">
              <Link href={`/team/${params.id}/availability`}>
                <Button variant="secondary">📋 Check Availability</Button>
              </Link>
              <Link href={`/create/match?teamId=${params.id}`}>
                <Button>⚽ Create Match</Button>
              </Link>
              <Link href={`/team/${params.id}/procurement`}>
                <Button variant="secondary">🛒 Squad Shopping</Button>
              </Link>
            </div>
          </section>
        )}

        <TeamMembers members={team.members} />

        <section style={{ display: "grid", gap: "0.75rem" }}>
          <p className="eyebrow">Matches</p>
          <MatchOverview matches={matches} />
        </section>
      </div>
    </main>
  );
}
