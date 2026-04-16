import type { TeamDetails } from "@korum/types/team";
import { getInitials } from "@/lib/helpers";

function roleBadgeClass(role: string) {
  return role.toUpperCase() === "CAPTAIN" ? "badge-primary" : "";
}

export function TeamMembers({ members }: Pick<TeamDetails, "members">) {
  if (members.length === 0) {
    return (
      <section className="panel" style={{ textAlign: "center", padding: "2rem" }}>
        <p className="eyebrow">Members</p>
        <p className="muted" style={{ marginTop: "0.5rem" }}>
          No members yet. Share the team invite code to get started.
        </p>
      </section>
    );
  }

  return (
    <section className="panel animate-in" style={{ display: "grid", gap: "1rem" }}>
      <div className="row-between">
        <div>
          <p className="eyebrow">Roster</p>
          <h3 className="title-md">Members</h3>
        </div>
        <span className="badge">{members.length}</span>
      </div>

      <div className="list">
        {members.map((member) => {
          const reliability = Math.round(member.reliabilityScore);
          const reliabilityColor =
            reliability >= 80 ? "var(--success)" :
            reliability >= 50 ? "var(--warning)" : "var(--danger)";

          return (
            <div key={member.membershipId} className="list-row">
              <div className="row" style={{ minWidth: 0 }}>
                <div className="avatar">{getInitials(member.fullName)}</div>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: "0.95rem" }}>
                    {member.fullName}
                  </strong>
                  <div className="faint" style={{ fontSize: "0.8rem", marginTop: "0.1rem" }}>
                    {member.phone}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem", flexShrink: 0 }}>
                <span className={`badge ${roleBadgeClass(member.role)}`}>
                  {member.role}
                </span>
                <div className="reliability-pill">
                  <span style={{
                    display: "inline-block", width: "0.45rem", height: "0.45rem",
                    borderRadius: "999px", background: reliabilityColor, flexShrink: 0,
                  }} aria-hidden="true" />
                  <span style={{ color: reliabilityColor }}>{reliability}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
