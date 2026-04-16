import Link from "next/link";

import type { MatchSummary } from "@korum/types/match";
import { formatDateTime } from "@korum/utils/date";
import { formatCurrencyINR, formatPercent } from "@korum/utils/format";

import { Button } from "@/components/ui/Button";

function statusVariant(status: string): "badge-success" | "badge-warning" | "badge-danger" | "" {
  const s = status.toUpperCase();
  if (["CONFIRMED", "LOCKED", "COMPLETED"].includes(s)) return "badge-success";
  if (["RSVP_OPEN", "PAYMENT_OPEN"].includes(s)) return "badge-warning";
  if (["CANCELLED"].includes(s)) return "badge-danger";
  return "";
}

export function MatchCard({ match }: { match: MatchSummary }) {
  const readinessPct = match.squadSize > 0 ? (match.confirmedCount / match.squadSize) * 100 : 0;
  const variant = statusVariant(match.status);

  return (
    <article
      className="panel animate-in"
      style={{ display: "grid", gap: "1rem" }}
    >
      {/* Header row */}
      <div className="row-between" style={{ alignItems: "flex-start", gap: "0.75rem" }}>
        <div style={{ display: "grid", gap: "0.3rem", minWidth: 0 }}>
          <span className={`badge ${variant}`}>
            {match.status.replaceAll("_", " ")}
          </span>
          <h3 className="title-md" style={{ marginTop: "0.4rem" }}>
            {match.title}
          </h3>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            📍 {match.venueName} · {formatDateTime(match.startsAt)}
          </p>
        </div>
        <span
          className="badge badge-primary"
          style={{ flexShrink: 0, fontFamily: "var(--font-display)" }}
        >
          {formatCurrencyINR(match.pricePerPlayer)}
        </span>
      </div>

      {/* Readiness progress */}
      <div style={{ display: "grid", gap: "0.4rem" }}>
        <div className="row-between" style={{ fontSize: "0.82rem" }}>
          <span className="muted">Squad readiness</span>
          <span style={{ fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--primary)" }}>
            {match.confirmedCount}/{match.squadSize}
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar__fill"
            style={{ width: `${Math.min(readinessPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-3">
        <div className="metric">
          <div className="eyebrow">Confirmed</div>
          <strong>{match.confirmedCount}</strong>
        </div>
        <div className="metric">
          <div className="eyebrow">Pending</div>
          <strong>{match.pendingCount}</strong>
        </div>
        <div className="metric">
          <div className="eyebrow">Ready</div>
          <strong>{formatPercent(match.readinessRatio)}</strong>
        </div>
      </div>

      {/* Footer */}
      <div className="row-between">
        <span className="faint">
          Code: <strong style={{ fontFamily: "var(--font-display)", color: "var(--primary)", letterSpacing: "0.05em" }}>{match.joinCode}</strong>
        </span>
        <Link href={`/match/${match.id}`}>
          <Button variant="secondary" size="sm">Open →</Button>
        </Link>
      </div>
    </article>
  );
}
