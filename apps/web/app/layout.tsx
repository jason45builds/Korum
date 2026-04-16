import type { ReactNode } from "react";
import type { Viewport } from "next";
import Link from "next/link";

import "@/styles/globals.css";

export const metadata = {
  title: "Korum",
  description: "Mobile-first sports match readiness platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1a7a4d",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect for faster font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Load Syne + DM Sans via link tag — more reliable than CSS @import in Next.js */}
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        {/* ── Desktop sticky header ── */}
        <header className="app-header">
          <div className="app-header__inner">
            <Link href="/" className="app-logo">
              <span className="app-logo__icon" aria-hidden="true">K</span>
              Korum
            </Link>
            <nav className="nav-links" aria-label="Main navigation">
              <Link href="/dashboard" className="nav-link">Dashboard</Link>
              <Link href="/create/match" className="nav-link">Create Match</Link>
              <Link href="/create/poll" className="nav-link">Availability</Link>
              <Link href="/match/join" className="nav-link">Join Match</Link>
            </nav>
          </div>
        </header>

        {children}

        {/* ── Mobile bottom tab bar ── */}
        <nav className="bottom-nav" aria-label="Mobile navigation">
          <div className="bottom-nav__inner">
            <Link href="/dashboard" className="bottom-nav__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5"/>
              </svg>
              Home
            </Link>

            <Link href="/match/join" className="bottom-nav__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 8v4l3 3"/>
              </svg>
              Join
            </Link>

            <Link href="/create/match" className="bottom-nav__item">
              <span style={{
                display: "grid",
                placeItems: "center",
                width: "2.6rem",
                height: "2.6rem",
                borderRadius: "50%",
                background: "var(--primary)",
                color: "white",
                marginTop: "-1.1rem",
                boxShadow: "0 4px 16px var(--primary-glow)",
                border: "3px solid var(--bg)",
              }} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </span>
              Create
            </Link>

            <Link href="/create/poll" className="bottom-nav__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
              Poll
            </Link>

            <Link href="/dashboard" className="bottom-nav__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              Profile
            </Link>
          </div>
        </nav>
      </body>
    </html>
  );
}
