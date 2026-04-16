import type { TeamDetails } from "@korum/types/team";

export function TeamStats({
  team,
  activeMatches,
}: {
  team: TeamDetails;
  activeMatches: number;
}) {
  const captainCount = team.members.filter((m) => m.role === "CAPTAIN").length;
  const avgReliability =
    team.members.length > 0
      ? team.members.reduce((total, m) => total + m.reliabilityScore, 0) / team.members.length
      : 0;
  const reliabilityPct = Math.min(Math.round(avgReliability), 100);

  const reliabilityColor =
    reliabilityPct >= 80 ? "var(--success)" :
    reliabilityPct >= 50 ? "var(--warning)" : "var(--danger)";

  return (
    <section className="panel animate-in" style={{ display: "grid", gap: "1rem" }}>
      <p className="eyebrow">Team Stats</p>

      <div className="grid grid-3" style={{ gap: "0.6rem" }}>
        <div className="metric">
          <div className="eyebrow">Members</div>
          <strong>{team.members.length}</strong>
        </div>
        <div className="metric">
          <div className="eyebrow">Captains</div>
          <strong>{captainCount}</strong>
        </div>
        <div className="metric">
          <div className="eyebrow">Upcoming</div>
          <strong>{activeMatches}</strong>
        </div>
      </div>

      {/* Avg reliability with visual bar */}
      <div style={{ display: "grid", gap: "0.5rem" }}>
        <div className="row-between" style={{ fontSize: "0.82rem" }}>
          <span className="muted">Avg reliability</span>
          <span style={{ fontWeight: 700, fontFamily: "var(--font-display)", color: reliabilityColor }}>
            {reliabilityPct}
          </span>
        </div>
        <div className="progress-bar">
          <div
            style={{
              height: "100%",
              borderRadius: "999px",
              background: reliabilityColor,
              width: `${reliabilityPct}%`,
              transition: "width 600ms ease",
            }}
          />
        </div>
      </div>
    </section>
  );
}
