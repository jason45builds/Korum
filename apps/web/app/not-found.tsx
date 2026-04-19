import Link from "next/link";

import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main>
      <div className="page-shell">
        <section className="hero-panel animate-in" style={{ display: "grid", gap: "1.25rem" }}>
          <div>
            <p className="eyebrow">404</p>
            <h1 className="title-lg" style={{ marginTop: "0.4rem" }}>
              Page not found.
            </h1>
            <p className="muted" style={{ marginTop: "0.4rem", fontSize: "0.9rem" }}>
              That URL doesn&apos;t exist. It may have been moved, deleted, or you may have followed a broken link.
            </p>
          </div>

          <div className="cluster">
            <Link href="/">
              <Button size="md">Go Home</Button>
            </Link>
            <Link href="/match/join">
              <Button variant="secondary" size="md">Join a Match</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="md">Dashboard</Button>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
