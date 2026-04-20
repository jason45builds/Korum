"use client";

import { useEffect } from "react";
import Link from "next/link";

import { MatchOverview } from "@/components/dashboard/MatchOverview";
import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";

export default function MatchesPage() {
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { dashboardMatches, loading, loadDashboard } = useMatch();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (isAuthenticated) void loadDashboard(); }, [isAuthenticated]);

  if (!authLoading && !isAuthenticated) {
    return <main><div className="page-shell"><AuthPanel title="Sign in to see your matches" /></div></main>;
  }
  if (authLoading || (loading && dashboardMatches.length === 0)) {
    return <main><Loader label="Loading matches…" /></main>;
  }

  const captainIds = new Set(dashboardMatches.filter((m) => m.captainId === profile?.id).map((m) => m.id));

  return (
    <main>
      <div className="page-shell">
        <div className="row-between">
          <div>
            <p className="eyebrow">Matches</p>
            <h1 className="title-lg" style={{ marginTop: "0.2rem" }}>Your fixtures</h1>
          </div>
          <Link href="/create/match"><Button size="sm">+ New</Button></Link>
        </div>
        <MatchOverview matches={dashboardMatches} captainMatchIds={captainIds} />
      </div>
    </main>
  );
}
