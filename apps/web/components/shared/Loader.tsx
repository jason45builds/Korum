export function Loader({ label = "Loading..." }: { label?: string }) {
  return (
    <div
      style={{
        display: "grid",
        justifyItems: "center",
        gap: "1rem",
        textAlign: "center",
        padding: "3rem 1rem",
      }}
    >
      {/* Spinning ring */}
      <div
        aria-hidden="true"
        style={{
          width: "2.5rem",
          height: "2.5rem",
          borderRadius: "999px",
          border: "3px solid var(--line)",
          borderTopColor: "var(--blue)",
          animation: "spin 0.75s linear infinite",
        }}
      />
      <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
        {label}
      </p>
    </div>
  );
}
