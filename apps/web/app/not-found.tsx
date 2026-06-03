import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <div className="page" style={{ alignItems: "center", textAlign: "center", paddingTop: 64 }}>
        <div style={{ fontSize: 64, marginBottom: 16, animation: "up 300ms ease both" }}>🏟️</div>
        <h1 className="t-h1" style={{ marginBottom: 8 }}>404 — Not found</h1>
        <p className="t-body" style={{ color: "var(--text-3)", maxWidth: 280, margin: "0 auto 32px" }}>
          This page doesn&apos;t exist or has been moved. Head back to the dashboard.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/dashboard">
            <button className="btn btn--primary">Go to Dashboard</button>
          </Link>
          <Link href="/match/join">
            <button className="btn btn--ghost">Join a Match</button>
          </Link>
        </div>
      </div>
    </main>
  );
}
