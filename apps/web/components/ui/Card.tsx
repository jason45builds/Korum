import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  title?: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
};

export function Card({ children, title, description, eyebrow, action, style, ...props }: CardProps) {
  return (
    <section
      className="panel animate-in"
      style={{ display: "grid", gap: "1rem", ...style }}
      {...props}
    >
      {(eyebrow || title || description || action) && (
        <div className="row-between" style={{ alignItems: "flex-start" }}>
          <div style={{ display: "grid", gap: "0.2rem" }}>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h3 className="title-md">{title}</h3>}
            {description && <p className="muted" style={{ fontSize: "0.88rem" }}>{description}</p>}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
