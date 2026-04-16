import type { MatchDetail } from "@korum/types/match";
import { getInitials } from "@/lib/helpers";
import { formatCurrencyINR } from "@korum/utils/format";

function paymentBadgeClass(status: string) {
  const s = status.toUpperCase();
  if (s === "PAID") return "badge-success";
  if (s === "PENDING") return "badge-warning";
  if (s === "REFUNDED") return "badge-primary";
  return "";
}

function participantBadgeClass(status: string) {
  const s = status.toUpperCase();
  if (["CONFIRMED", "LOCKED"].includes(s)) return "badge-success";
  if (s === "INVITED") return "badge-warning";
  if (s === "DECLINED") return "badge-danger";
  return "";
}

export function PlayerList({ participants }: Pick<MatchDetail, "participants">) {
  if (participants.length === 0) {
    return (
      <section className="panel" style={{ textAlign: "center", padding: "2rem" }}>
        <p className="eyebrow">Squad Board</p>
        <p className="muted" style={{ marginTop: "0.5rem" }}>No players yet. Share the join code to invite your squad.</p>
      </section>
    );
  }

  return (
    <section className="panel animate-in" style={{ display: "grid", gap: "1rem" }}>
      <div className="row-between">
        <div>
          <p className="eyebrow">Squad Board</p>
          <h3 className="title-md">Players</h3>
        </div>
        <span className="badge">{participants.length}</span>
      </div>

      <div className="list">
        {participants.map((player) => {
          const reliability = Math.round(player.reliabilityScore);
          const reliabilityColor =
            reliability >= 80 ? "var(--success)" :
            reliability >= 50 ? "var(--warning)" :
            "var(--danger)";

          return (
            <div key={player.participantId} className="list-row">
              {/* Left: Avatar + name */}
              <div className="row" style={{ minWidth: 0, gap: "0.75rem" }}>
                <div className="avatar">{getInitials(player.fullName)}</div>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: "0.95rem" }}>
                    {player.fullName}
                  </strong>
                  {/* Reliability pill */}
                  <div className="reliability-pill" style={{ marginTop: "0.15rem" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: "0.5rem",
                        height: "0.5rem",
                        borderRadius: "999px",
                        background: reliabilityColor,
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    />
                    <span style={{ color: reliabilityColor }}>{reliability}</span>
                    <span style={{ color: "var(--text-faint)" }}>reliability</span>
                  </div>
                </div>
              </div>

              {/* Right: Status badges */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem", flexShrink: 0 }}>
                <span className={`badge ${participantBadgeClass(player.status)}`}>
                  {player.status.replaceAll("_", " ")}
                </span>
                <span className={`badge ${paymentBadgeClass(player.paymentStatus)}`}
                  style={{ fontSize: "0.72rem" }}>
                  {player.paymentStatus.replaceAll("_", " ")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
