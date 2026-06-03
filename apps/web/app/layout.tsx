import type { ReactNode } from "react";
import type { Viewport } from "next";
import Link from "next/link";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { BottomNav } from "@/components/layout/BottomNav";
import { AppShell } from "@/components/layout/AppShell";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import "@/styles/globals.css";

const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["600", "700", "800"],
});
const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://korum.vercel.app";

export const metadata = {
  title: { default: "Korum — Match Readiness for Amateur Sports", template: "%s · Korum" },
  description: "Build your squad before kickoff. Captain shares a link, players confirm and pay, squad locks automatically. No app download needed.",
  metadataBase: new URL(APP_URL),
  applicationName: "Korum",
  keywords: ["cricket", "football", "amateur sports", "match organizer", "squad", "team management", "Chennai", "India"],
  authors: [{ name: "Korum" }],
  openGraph: {
    title: "Korum — Match Readiness for Amateur Sports",
    description: "Build your squad before kickoff. Captain shares a link, players confirm and pay.",
    url: APP_URL,
    siteName: "Korum",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Korum — Match Readiness Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Korum — Match Readiness for Amateur Sports",
    description: "Build your squad before kickoff.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Korum",
    startupImage: ["/icons/icon-512.svg"],
  },
  formatDetection: { telephone: false },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#2563EB",
    "msapplication-tap-highlight": "no",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563EB" },
    { media: "(prefers-color-scheme: dark)",  color: "#2563EB" },
  ],
  userScalable: true,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en-IN"
      className={`${displayFont.variable} ${bodyFont.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Critical inline styles — prevent FOUC before CSS loads */}
        <style dangerouslySetInnerHTML={{ __html: `
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
          html{height:100%;scroll-behavior:smooth;-webkit-tap-highlight-color:transparent}
          body{min-height:100dvh;background:#F4F6F9;color:#101828;font-family:var(--font-body,Inter),-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
          .app-header{position:sticky;top:0;z-index:50;background:rgba(255,255,255,0.98);border-bottom:1px solid #E5E9EF;height:56px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
          .app-header__inner{max-width:480px;height:100%;margin:0 auto;padding:0 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
          .bottom-nav{position:fixed;bottom:0;left:0;right:0;z-index:50;height:60px;background:rgba(255,255,255,0.97);border-top:1px solid #E5E9EF;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);padding-bottom:env(safe-area-inset-bottom,0px)}
          .bottom-nav__inner{display:flex;align-items:center;justify-content:space-around;height:100%;max-width:480px;margin:0 auto;padding:0 8px}
          .bottom-nav__item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 12px;min-width:52px;font-size:10px;font-weight:700;color:#98A2B3;text-decoration:none;text-transform:uppercase;letter-spacing:0.04em}
          .bottom-nav__item svg{width:22px;height:22px;stroke-width:1.7}
          main{padding-top:16px;padding-bottom:calc(60px + env(safe-area-inset-bottom,0px) + 16px)}
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
          @supports(padding:max(0px)){.app-header{padding-top:env(safe-area-inset-top,0px);height:calc(56px + env(safe-area-inset-top,0px))}}
        ` }} />
      </head>
      <body suppressHydrationWarning>

        {/* ── Top header ─────────────────────────────────────────────────── */}
        <header className="app-header">
          <div className="app-header__inner">

            {/* Left — hamburger */}
            <Link href="/menu" className="app-header__icon-btn" aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6"  x2="21" y2="6"  />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </Link>

            {/* Centre — wordmark */}
            <Link href="/dashboard" className="app-logo">
              <span className="app-logo__icon">K</span>
              Korum
            </Link>

            {/* Right — icons */}
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
              <NotificationBell />
            </div>

          </div>
        </header>

        {/* AppShell handles SW registration, analytics, PWA banner */}
        <ErrorBoundary>
          <AppShell>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </AppShell>
        </ErrorBoundary>

        <BottomNav />

      </body>
    </html>
  );
}
