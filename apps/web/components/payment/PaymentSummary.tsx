import { formatCurrencyINR } from "@korum/utils/format";
import type { MatchDetail } from "@korum/types/match";

export function PaymentSummary({ match }: { match: MatchDetail }) {
  const confirmedCount = match.participants.filter((p) =>
    ["CONFIRMED", "LOCKED"].includes(p.status),
  ).length;
  const pendingCount = match.participants.length - confirmedCount;
  const collectedAmount = confirmedCount * match.pricePerPlayer;
  const targetAmount = match.squadSize * match.pricePerPlayer;
  const collectedPct = targetAmount > 0 ? Math.round((collectedAmount / targetAmount) * 100) : 0;

  return (
    <section className="panel animate-in" style={{ display: "grid", gap: "1rem" }}>
      <div>
        <p className="eyebrow">Payment Snapshot</p>
        <h3 className="title-md">{formatCurrencyINR(match.pricePerPlayer)} per player</h3>
        <p className="muted" style={{ fontSize: "0.88rem", marginTop: "0.25rem" }}>
          Payment locks a squad slot. Unpaid players lose their hold when the deadline passes.
        </p>
      </div>

      {/* Collection progress */}
      <div style={{ display: "grid", gap: "0.5rem" }}>
        <div className="row-between" style={{ fontSize: "0.82rem" }}>
          <span className="muted">Amount collected</span>
          <span style={{ fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--primary)" }}>
            {formatCurrencyINR(collectedAmount)} / {formatCurrencyINR(targetAmount)}
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar__fill"
            style={{ width: `${Math.min(collectedPct, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: "0.6rem" }}>
        <div className="metric">
          <div className="eyebrow">Confirmed</div>
          <strong>{confirmedCount}</strong>
          <div className="faint" style={{ fontSize: "0.78rem" }}>of {match.squadSize}</div>
        </div>
        <div className="metric">
          <div className="eyebrow">Pending</div>
          <strong>{pendingCount}</strong>
          <div className="faint" style={{ fontSize: "0.78rem" }}>awaiting payment</div>
        </div>
      </div>
    </section>
  );
}
