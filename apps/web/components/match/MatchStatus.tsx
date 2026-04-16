import type { MatchDetail } from "@korum/types/match";

import { describeMatchState } from "@/services/core/matchState";
import { getLockDeadlineText, getPaymentDeadlineText } from "@/services/core/deadline";
import { formatPercent } from "@korum/utils/format";

export function MatchStatus({ match }: { match: MatchDetail }) {
  const confirmedCount = match.participants.filter((p) =>
    ["CONFIRMED", "LOCKED"].includes(p.status),
  ).length;
  const readiness = match.squadSize > 0 ? confirmedCount / match.squadSize : 0;
  const readinessPct = Math.round(readiness * 100);

  return (
    <section className="panel animate-in" style={{ display: "grid", gap: "1rem" }}>
      <div>
        <p className="eyebrow">Match Status</p>
        <h3 className="title-md">{match.status.replaceAll("_", " ")}</h3>
        <p className="muted" style={{ fontSize: "0.88rem", marginTop: "0.25rem" }}>
          {describeMatchState(match.status)}
        </p>
      </div>

      {/* Readiness progress */}
      <div style={{ display: "grid", gap: "0.5rem" }}>
        <div className="row-between" style={{ fontSize: "0.82rem" }}>
          <span className="muted">Squad readiness</span>
          <span style={{ fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--primary)" }}>
            {confirmedCount} / {match.squadSize} · {readinessPct}%
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar__fill"
            style={{ width: `${Math.min(readinessPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Deadline metrics */}
      <div className="grid grid-3" style={{ gap: "0.6rem" }}>
        <div className="metric">
          <div className="eyebrow">Readiness</div>
          <strong>{formatPercent(readiness)}</strong>
        </div>
        <div className="metric">
          <div className="eyebrow">Payment due</div>
          <strong style={{ fontSize: "0.95rem" }}>{getPaymentDeadlineText(match)}</strong>
        </div>
        <div className="metric">
          <div className="eyebrow">Locks at</div>
          <strong style={{ fontSize: "0.95rem" }}>{getLockDeadlineText(match)}</strong>
        </div>
      </div>
    </section>
  );
}
