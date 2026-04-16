"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { MatchOverview } from "@/components/dashboard/MatchOverview";
import { TeamHeader } from "@/components/team/TeamHeader";
import { TeamMembers } from "@/components/team/TeamMembers";
import { TeamStats } from "@/components/team/TeamStats";
import { AuthPanel } from "@/components/shared/AuthPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { Loader } from "@/components/shared/Loader";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";
import { getTeamDetails } from "@/services/api/team";
import type { MatchSummary } from "@korum/types/match";
import type { TeamDetails } from "@korum/types/team";

export default function TeamPage() {
  const params = useParams<{ id: string }>();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { loadTeamMatches } = useMatch();
  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [teamResponse, teamMatches] = await Promise.all([
          getTeamDetails(params.id),
          loadTeamMatches(params.id),
        ]);
        setTeam(teamResponse.team);
        setMatches(teamMatches);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isAuthenticated, loadTeamMatches, params.id]);

  if (!authLoading && !isAuthenticated) {
    return (
      <main>
        <AuthPanel title="Sign in for team access" />
      </main>
    );
  }

  if (loading) {
    return (
      <main>
        <Loader label="Loading team..." />
      </main>
    );
  }

  if (!team) {
    return (
      <main>
        <EmptyState
          title="Team not found"
          description="That team could not be loaded for your account."
        />
      </main>
    );
  }

  return (
    <main>
      <div className="page-shell">
        <TeamHeader team={team} />
        <TeamStats team={team} activeMatches={matches.length} />
        <TeamMembers members={team.members} />
        <section>
          <p className="eyebrow">Upcoming Matches</p>
          <MatchOverview matches={matches} />
        </section>
      </div>
    </main>
  );
}
