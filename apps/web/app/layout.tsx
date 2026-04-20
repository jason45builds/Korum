import type { ReactNode } from "react";
import type { Viewport } from "next";
import Link from "next/link";
import { DM_Sans, Syne } from "next/font/google";
import "@/styles/globals.css";

const displayFont = Syne({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const bodyFont    = DM_Sans({ subsets: ["latin"], variable: "--font-body",    display: "swap" });

export const metadata = {
  title: "Korum",
  description: "Match readiness for amateur sports. Captain shares link, players pay to confirm.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        {/* Top header — desktop only */}
        <header className="app-header">
          <div className="app-header__inner">
            <Link href="/" className="app-logo">
              <span className="app-logo__icon">K</span>
              Korum
            </Link>
            <nav className="nav-links" aria-label="Desktop navigation">
              <Link href="/dashboard"    className="nav-link">Home</Link>
              <Link href="/matches"      className="nav-link">Matches</Link>
              <Link href="/teams"        className="nav-link">Teams</Link>
              <Link href="/create/match" className="nav-link">+ Create</Link>
            </nav>
          </div>
        </header>

        {children}

        {/* Bottom nav — mobile only */}
        <nav className="bottom-nav" aria-label="Mobile navigation">
          <div className="bottom-nav__inner">

            {/* Home */}
            <Link href="/dashboard" className="bottom-nav__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Home
            </Link>

            {/* Matches */}
            <Link href="/matches" className="bottom-nav__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4l2.5 2.5" />
              </svg>
              Matches
            </Link>

            {/* Create — FAB */}
            <Link href="/create/match" className="bottom-nav__item" aria-label="Create match">
              <span className="bottom-nav__fab">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span style={{ marginTop: 4 }}>Create</span>
            </Link>

            {/* Teams */}
            <Link href="/teams" className="bottom-nav__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
              Teams
            </Link>

            {/* Profile */}
            <Link href="/dashboard" className="bottom-nav__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true">
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
