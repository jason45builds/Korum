"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import type { UserProfile } from "@korum/types/user";

export function DashboardHeader({
  profile,
  onSignOut,
}: {
  profile?: UserProfile | null;
  onSignOut?: () => void;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <section className="hero-panel animate-in" style={{ display: "grid", gap: "1.25rem" }}>
      <div className="row-between" style={{ alignItems: "flex-start" }}>
        <div>
          <p className="eyebrow">Captain Console</p>
          <h1 className="title-lg">
            {greeting}{profile?.displayName ? `, ${profile.displayName}` : ""}
          </h1>
          <p className="muted" style={{ marginTop: "0.25rem", fontSize: "0.9rem" }}>
            Track readiness, payments, and your squad from here.
          </p>
        </div>

        {onSignOut && (
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            Sign out
          </Button>
        )}
      </div>

      <div className="cluster">
        <Link href="/create/match">
          <Button size="md">+ Create Match</Button>
        </Link>
        <Link href="/create/poll">
          <Button variant="secondary" size="md">Availability Poll</Button>
        </Link>
        <Link href="/match/join">
          <Button variant="ghost" size="md">Join Match</Button>
        </Link>
      </div>
    </section>
  );
}
