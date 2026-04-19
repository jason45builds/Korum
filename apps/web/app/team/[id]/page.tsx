"use client";

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

  return (
    <main>
      <div className="page-shell">
        <TeamHeader team={team} />
        <TeamStats team={team} activeMatches={matches.length} />

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
