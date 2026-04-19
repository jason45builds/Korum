import Link from "next/link";

import type { MatchSummary } from "@korum/types/match";
import { formatDateTime } from "@korum/utils/date";
import { formatCurrencyINR, formatPercent } from "@korum/utils/format";

import { Button } from "@/components/ui/Button";

function statusVariant(status: string): string {
  const s = status.toUpperCase();
  if (["CONFIRMED", "LOCKED", "READY"].includes(s)) return "badge-success";
  if (["RSVP_OPEN", "PAYMENT_PENDING"].includes(s))  return "badge-warning";
  if (s === "CANCELLED") return "badge-danger";
  return "";
}

export function MatchCard({ match, isCaptain }: { match: MatchSummary; isCaptain?: boolean }) {
  const readinessPct = match.squadSize > 0 ? (match.confirmedCount / match.squadSize) * 100 : 0;

  return (
    <article className="panel animate-in" style={{ display: "grid", gap: "1rem" }}>
      <div className="row-between" style={{ alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <span className={`badge ${statusVariant(match.status)}`}>
            {match.status.replaceAll("_", " ")}
          </span>
          <h3 className="title-md" style={{ marginTop: "0.4rem" }}>{match.title}</h3>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            📍 {match.venueName} · {formatDateTime(match.startsAt)}
          </p>
        </div>
        <span className="badge badge-primary" style={{ flexShrink: 0 }}>
          {formatCurrencyINR(match.pricePerPlayer)}
        </span>
      </div>

      <div style={{ display: "grid", gap: "0.4rem" }}>
        <div className="row-between" style={{ fontSize: "0.82rem" }}>
          <span className="muted">Squad readiness</span>
          <span style={{ fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--primary)" }}>
            {match.confirmedCount}/{match.squadSize}
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar__fill" style={{ width: `${Math.min(readinessPct, 100)}%` }} />
        </div>
      </div>

      <div className="grid grid-3" style={{ gap: "0.5rem" }}>
        <div className="metric"><div className="eyebrow">Confirmed</div><strong>{match.confirmedCount}</strong></div>
        <div className="metric"><div className="eyebrow">Pending</div><strong>{match.pendingCount}</strong></div>
        <div className="metric"><div className="eyebrow">Ready</div><strong>{formatPercent(match.readinessRatio)}</strong></div>
      </div>

      <div className="row-between">
        <span className="faint">
          Code: <strong style={{ fontFamily: "var(--font-display)", color: "var(--primary)", letterSpacing: "0.05em" }}>
            {match.joinCode}
          </strong>
        </span>
        <div className="cluster" style={{ gap: "0.5rem" }}>
          {isCaptain && (
            <Link href={`/match/control?matchId=${match.id}`}>
              <Button variant="secondary" size="sm">Control Panel</Button>
            </Link>
          )}
          <Link href={`/match/${match.id}`}>
            <Button size="sm">Open</Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
