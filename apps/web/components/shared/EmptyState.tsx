import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="panel"
      style={{
        textAlign: "center",
        display: "grid",
        gap: "1rem",
        padding: "2.5rem 1.5rem",
        justifyItems: "center",
      }}
    >
      {icon && (
        <div
          aria-hidden="true"
          style={{
            fontSize: "2.5rem",
            lineHeight: 1,
            filter: "grayscale(0.2)",
          }}
        >
          {icon}
        </div>
      )}
      <div>
        <h3 className="title-md">{title}</h3>
        <p className="muted" style={{ marginTop: "0.4rem", fontSize: "0.9rem" }}>{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
