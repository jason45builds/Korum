"use client";

import { copyToClipboard } from "@/lib/helpers";
import type { MatchDetail } from "@korum/types/match";
import { formatDateTime } from "@korum/utils/date";
import { formatCurrencyINR } from "@korum/utils/format";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

function statusBadgeClass(status: string) {
  const s = status.toUpperCase();
  if (["CONFIRMED", "LOCKED", "COMPLETED"].includes(s)) return "badge-success";
  if (["RSVP_OPEN", "PAYMENT_OPEN"].includes(s)) return "badge-warning";
  if (s === "CANCELLED") return "badge-danger";
  return "badge-primary";
}

export function MatchHeader({ match }: { match: MatchDetail }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(match.joinCode);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="hero-panel animate-in" style={{ display: "grid", gap: "1.25rem" }}>
      {/* Top row */}
      <div className="row-between" style={{ alignItems: "flex-start" }}>
        <div style={{ display: "grid", gap: "0.3rem", minWidth: 0 }}>
          <p className="eyebrow">{match.teamName}</p>
          <h1 className="title-lg">{match.title}</h1>
          <p className="muted" style={{ fontSize: "0.88rem" }}>
            📍 {match.venueName}
            {match.venueAddress ? ` · ${match.venueAddress}` : ""}
          </p>
        </div>
        <span className={`badge ${statusBadgeClass(match.status)}`} style={{ flexShrink: 0 }}>
          {match.status.replaceAll("_", " ")}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-3">
        <div className="metric">
          <div className="eyebrow">Kickoff</div>
          <strong style={{ fontSize: "1rem" }}>{formatDateTime(match.startsAt)}</strong>
        </div>
        <div className="metric">
          <div className="eyebrow">Per Player</div>
          <strong>{formatCurrencyINR(match.pricePerPlayer)}</strong>
        </div>
        <div className="metric">
          <div className="eyebrow">Join Code</div>
          <strong style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em", color: "var(--primary)" }}>
            {match.joinCode}
          </strong>
        </div>
      </div>

      {/* Footer row */}
      <div className="row-between">
        <span className="faint">
          Captain: <strong style={{ color: "var(--text-muted)" }}>{match.captainName}</strong>
        </span>
        <Button
          variant={copied ? "secondary" : "ghost"}
          size="sm"
          onClick={() => void handleCopy()}
        >
          {copied ? "✓ Copied!" : "Copy Code"}
        </Button>
      </div>
    </section>
  );
}
