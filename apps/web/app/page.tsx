import Link from "next/link";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <main>
      <div className="page-shell">

        {/* ── Hero ── */}
        <section className="hero-panel animate-in" style={{ display: "grid", gap: "1.5rem" }}>
          <div>
            <p className="eyebrow">Match Readiness Platform</p>
            <h1 className="title-xl" style={{ marginTop: "0.4rem", marginBottom: "0.75rem" }}>
              Build the squad before kickoff.
            </h1>
            <p className="muted" style={{ fontSize: "1rem", maxWidth: "38rem" }}>
              Korum helps captains collect RSVPs, confirm paid slots, manage invites,
              and lock amateur sports matches before game time.
            </p>
          </div>

          <div className="cluster">
            <Link href="/dashboard">
              <Button size="lg">Open Dashboard</Button>
            </Link>
            <Link href="/create/match">
              <Button variant="secondary" size="lg">Create Match</Button>
            </Link>
            <Link href="/match/join">
              <Button variant="ghost" size="lg">Join Match</Button>
            </Link>
          </div>

          {/* Stats strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "0.75rem",
              paddingTop: "1rem",
              borderTop: "1px solid var(--line)",
            }}
          >
            {[
              { value: "RSVP", label: "Collect responses" },
              { value: "PAY",  label: "Lock with payment" },
              { value: "GO",   label: "Match-day ready"  },
            ].map(({ value, label }) => (
              <div key={value} style={{ textAlign: "center" }}>
                <div style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "1.1rem",
                  color: "var(--primary)",
                  letterSpacing: "0.06em",
                }}>
                  {value}
                </div>
                <div className="faint" style={{ fontSize: "0.78rem", marginTop: "0.15rem" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Feature cards ── */}
        <div className="grid grid-3">
          {[
            {
              icon: "🏴",
              role: "Captains",
              title: "Create & lock squads",
              body: "Create the fixture, track payments, send invites, and freeze the final list before the match begins.",
            },
            {
              icon: "⚡",
              role: "Players",
              title: "Join & pay quickly",
              body: "Join from a shared code or invite, confirm your availability, and pay to keep your spot safe.",
            },
            {
              icon: "📡",
              role: "Realtime",
              title: "See readiness live",
              body: "Squad changes, payment updates, and match-state changes sync through Supabase subscriptions.",
            },
          ].map(({ icon, role, title, body }) => (
            <div className="panel animate-in" key={role}>
              <div style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }} aria-hidden="true">
                {icon}
              </div>
              <p className="eyebrow">{role}</p>
              <h3 className="title-md" style={{ marginTop: "0.3rem" }}>{title}</h3>
              <p className="muted" style={{ fontSize: "0.88rem", marginTop: "0.4rem" }}>{body}</p>
            </div>
          ))}
        </div>

        {/* ── Auth ── */}
        <AuthPanel />
      </div>
    </main>
  );
}
