"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const MENU_ITEMS = [
  { icon: "🏏", label: "Create Match",    href: "/create/match",  primary: true },
  { icon: "🔗", label: "Join Match",      href: "/match/join",    primary: false },
  { icon: "🏟️", label: "My Teams",       href: "/teams",         primary: false },
  { icon: "📅", label: "My Matches",      href: "/matches",       primary: false },
  { icon: "📋", label: "Availability",     href: "/availability",     primary: false },
  { icon: "🏪", label: "Marketplace",      href: "/marketplace",      primary: false },
  { icon: "🏦", label: "Vendor Dashboard", href: "/vendor/dashboard", primary: false },
  { icon: "👥", label: "Invite Friends",   href: "/invite",           primary: false },
  { icon: "❓", label: "Help & FAQs",     href: "/help",          primary: false },
];

export default function MenuPage() {
  const { profile, isAuthenticated, signOut } = useAuth();
  const router = useRouter();

  return (
    <main style={{ minHeight: "100dvh", background: "var(--bg)" }}>
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "0 var(--page-x)" }}>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <h1 className="t-h2">Menu</h1>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "1px solid var(--line)", borderRadius: "var(--r-full)", padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "var(--text-3)", cursor: "pointer" }}>
            ✕ Close
          </button>
        </div>

        {/* Profile strip */}
        {isAuthenticated && profile ? (
          <div className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "var(--blue-soft)", border: "2px solid var(--blue-border)",
              display: "grid", placeItems: "center",
              fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 16, color: "var(--blue)",
            }}>
              {(profile.displayName ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>
                {profile.displayName}
              </p>
              <p className="t-caption" style={{ marginTop: 2 }}>{profile.phone ?? "Korum member"}</p>
            </div>
            <Link href="/profile">
              <button className="btn btn--ghost btn--sm">View</button>
            </Link>
          </div>
        ) : (
          <div className="card" style={{ padding: "16px", marginBottom: 16, textAlign: "center" }}>
            <p className="t-body" style={{ color: "var(--text-3)", marginBottom: 12 }}>
              Sign in for full access
            </p>
            <Link href="/auth">
              <button className="btn btn--primary btn--block">Sign In / Sign Up</button>
            </Link>
          </div>
        )}

        {/* Primary CTA */}
        <Link href="/create/match" style={{ display: "block", marginBottom: 16 }}>
          <button className="btn btn--primary btn--block btn--lg" style={{ borderRadius: "var(--r-lg)" }}>
            🏏 Create a Match
          </button>
        </Link>

        {/* Nav items */}
        <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
          {MENU_ITEMS.filter(i => !i.primary).map(({ icon, label, href }, idx, arr) => (
            <Link key={href} href={href}>
              <div style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "15px 16px",
                borderBottom: idx < arr.length - 1 ? "1px solid var(--line)" : "none",
              }}>
                <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{icon}</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, flex: 1 }}>{label}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Sign out */}
        {isAuthenticated && (
          <button
            onClick={() => void signOut()}
            style={{ width: "100%", padding: "14px 16px", background: "var(--red-soft)", border: "1px solid var(--red-border)", borderRadius: "var(--r-lg)", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
            <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>🚪</span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--red)" }}>Sign Out</span>
          </button>
        )}

        <p className="t-caption" style={{ textAlign: "center", color: "var(--text-4)", padding: "24px 0" }}>
          Korum v1.0
        </p>

      </div>
    </main>
  );
}
