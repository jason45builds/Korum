import type { ReactNode } from "react";
import type { Viewport } from "next";
import Link from "next/link";
import { DM_Sans, Syne } from "next/font/google";
import { BottomNav } from "@/components/layout/BottomNav";
import "@/styles/globals.css";

const displayFont = Syne({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const bodyFont    = DM_Sans({ subsets: ["latin"], variable: "--font-body",    display: "swap" });

export const metadata = {
  title: "Korum",
  description: "Match readiness for amateur sports teams.",
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

        {/* ── Top header: [ ☰ ] KORUM [ 🔍 ] [ 💬 ] [ 🔔 ] ─────────────── */}
        <header className="app-header">
          <div className="app-header__inner">

            {/* Left — hamburger menu */}
            <Link href="/menu" className="app-header__icon-btn" aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6"  x2="21" y2="6"  />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </Link>

            {/* Centre — logo */}
            <Link href="/dashboard" className="app-logo">
              <span className="app-logo__icon">K</span>
              Korum
            </Link>

            {/* Right — search, messages, notifications */}
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Link href="/search" className="app-header__icon-btn" aria-label="Search">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </Link>
              <Link href="/messages" className="app-header__icon-btn" aria-label="Messages">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </Link>
              <Link href="/activity" className="app-header__icon-btn" aria-label="Notifications">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              </Link>
            </div>

          </div>
        </header>

        {children}

        {/* Active-aware bottom nav (client component) */}
        <BottomNav />

      </body>
    </html>
  );
}
