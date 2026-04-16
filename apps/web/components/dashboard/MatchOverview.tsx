import type { MatchSummary } from "@korum/types/match";

import { EmptyState } from "@/components/shared/EmptyState";
import { MatchCard } from "@/components/match/MatchCard";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function MatchOverview({ matches }: { matches: MatchSummary[] }) {
  if (matches.length === 0) {
    return (
      <EmptyState
        icon="⚽"
        title="No matches yet"
        description="Create the first match for your squad and start collecting RSVPs."
        action={
          <Link href="/create/match">
            <Button size="sm">Create Match</Button>
          </Link>
        }
      />
    );
  }

  return (
    <section className="grid">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </section>
  );
}
