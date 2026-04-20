import type { ReactNode } from "react";
import type { Viewport } from "next";
import Link from "next/link";
import { DM_Sans, Syne } from "next/font/google";
import "@/styles/globals.css";

const displayFont = Syne({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const bodyFont    = DM_Sans({ subsets: ["latin"], variable: "--font-body",    display: "swap" });

export const metadata = {
  title: "Korum — Match Readiness",
  description: "Captain shares a link. Players pay to confirm. Squad locks automatically.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2563eb",
};

function NavIcon({ path }: { path: string }) {
  const icons: Record<string, string> = {
    home:    "M3 12L12 3l9 9M9 21V12h6v9",
    matches: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    teams:   "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 110 0z",
    profile: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 110 8 4 4 0 010-8z",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      {path.split("M").filter(Boolean).map((d, i) => (
        <path key={i} d={`M${d}`} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

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
            <nav className="nav-links" aria-label="Main navigation">
              <Link href="/dashboard"    className="nav-link">Home</Link>
              <Link href="/matches"      className="nav-link">Matches</Link>
              <Link href="/teams"        className="nav-link">Teams</Link>
              <Link href="/create/match" className="nav-link">+ Create</Link>
            </nav>
          </div>
        </header>

        {children}

        <nav className="bottom-nav" aria-label="Mobile navigation">
          <div className="bottom-nav__inner">

            <Link href="/dashboard" className="bottom-nav__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M3 12L12 3l9 9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Home
            </Link>

            <Link href="/matches" className="bottom-nav__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4l3 3" strokeLinecap="round" />
              </svg>
              Matches
            </Link>

            {/* Create FAB */}
            <Link href="/create/match" className="bottom-nav__item">
              <span className="bottom-nav__fab" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              Create
            </Link>

            <Link href="/teams" className="bottom-nav__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" />
              </svg>
              Teams
            </Link>

            <Link href="/dashboard#profile" className="bottom-nav__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
              </svg>
              Profile
            </Link>

          </div>
        </nav>
      </body>
    </html>
  );
}
