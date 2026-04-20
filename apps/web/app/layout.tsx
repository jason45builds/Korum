import type { ReactNode } from "react";
import type { Viewport } from "next";
import Link from "next/link";
import { DM_Sans, Syne } from "next/font/google";
import "@/styles/globals.css";

const displayFont = Syne({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const bodyFont    = DM_Sans({ subsets: ["latin"], variable: "--font-body",    display: "swap" });

export const metadata = {
  title: "Korum",
  description: "Match readiness for amateur sports captains",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1a7a4d",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <header className="app-header">
          <div className="app-header__inner">
            <Link href="/" className="app-logo">
              <span className="app-logo__icon" aria-hidden="true">K</span>
              Korum
            </Link>
            {/* Desktop nav — hidden on mobile */}
            <nav className="nav-links" aria-label="Main navigation">
              <Link href="/dashboard"    className="nav-link">Home</Link>
              <Link href="/matches"      className="nav-link">Matches</Link>
              <Link href="/teams"        className="nav-link">Teams</Link>
              <Link href="/availability" className="nav-link">Availability</Link>
            </nav>
          </div>
        </header>

        {children}

        {/* Mobile bottom nav — 4 tabs only */}
        <nav className="bottom-nav" aria-label="Mobile navigation">
          <div className="bottom-nav__inner">

            {/* Home */}
            <Link href="/dashboard" className="bottom-nav__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" />
              </svg>
              Home
            </Link>

            {/* Matches */}
            <Link href="/matches" className="bottom-nav__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4l3 3" />
              </svg>
              Matches
            </Link>

            {/* Create — FAB center */}
            <Link href="/create/match" className="bottom-nav__item">
              <span className="bottom-nav__fab" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              Create
            </Link>

            {/* Teams */}
            <Link href="/teams" className="bottom-nav__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <circle cx="9" cy="7" r="3" /><circle cx="17" cy="9" r="2.5" />
                <path d="M2 21c0-4 3-6 7-6s7 2 7 6" /><path d="M18 15c2 0 4 1 4 4" />
              </svg>
              Teams
            </Link>

            {/* Profile */}
            <Link href="/dashboard#profile" className="bottom-nav__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              Profile
            </Link>

          </div>
        </nav>
      </body>
    </html>
  );
}
