import type { MatchSummary } from "@korum/types/match";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { MatchCard } from "@/components/match/MatchCard";

export function MatchOverview({
  matches,
  captainMatchIds,
}: {
  matches: MatchSummary[];
  captainMatchIds?: Set<string>;
}) {
  if (matches.length === 0) {
    return (
      <EmptyState
        icon="⚽"
        title="No matches yet"
        description="Create the first match for your squad and start collecting RSVPs."
        action={<Link href="/create/match"><Button size="sm">Create Match</Button></Link>}
      />
    );
  }

  return (
    <section className="grid">
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          isCaptain={captainMatchIds?.has(match.id)}
        />
      ))}
    </section>
  );
}
