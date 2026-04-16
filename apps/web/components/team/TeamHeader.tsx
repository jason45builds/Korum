"use client";

import type { TeamDetails } from "@korum/types/team";
import { useState } from "react";
import { copyToClipboard } from "@/lib/helpers";
import { Button } from "@/components/ui/Button";

const SPORT_EMOJIS: Record<string, string> = {
  Football: "⚽", Cricket: "🏏", Basketball: "🏀",
  Badminton: "🏸", Tennis: "🎾", Hockey: "🏑",
  Volleyball: "🏐", Rugby: "🏉",
};

export function TeamHeader({ team }: { team: TeamDetails }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(team.inviteCode);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const sportEmoji = SPORT_EMOJIS[team.sport] ?? "🏅";

  return (
    <section className="hero-panel animate-in" style={{ display: "grid", gap: "1.25rem" }}>
      <div className="row-between" style={{ alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          <div style={{
            width: "3.5rem", height: "3.5rem", borderRadius: "var(--radius-md)",
            background: "var(--primary-soft)", display: "grid", placeItems: "center",
            fontSize: "1.6rem", flexShrink: 0,
          }} aria-hidden="true">
            {sportEmoji}
          </div>
          <div>
            <p className="eyebrow">{team.sport}</p>
            <h1 className="title-lg">{team.name}</h1>
            <p className="muted" style={{ fontSize: "0.88rem", marginTop: "0.15rem" }}>
              📍 {team.city}
            </p>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div className="faint" style={{ fontSize: "0.72rem", marginBottom: "0.25rem", fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Invite Code
          </div>
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.15rem",
            color: "var(--primary)", letterSpacing: "0.12em",
          }}>
            {team.inviteCode}
          </div>
        </div>
      </div>

      <div className="row-between">
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          Share the invite code with players to add them to this squad space.
        </p>
        <Button variant={copied ? "secondary" : "ghost"} size="sm" onClick={() => void handleCopy()}>
          {copied ? "✓ Copied!" : "Copy Code"}
        </Button>
      </div>
    </section>
  );
}
