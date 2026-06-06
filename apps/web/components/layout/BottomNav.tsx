"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMatch } from "@/hooks/useMatch";
import { useAuth } from "@/hooks/useAuth";

// 5 tabs. Activity merged into a notification dot on the Matches tab.
// Tournaments replaces the old Activity tab slot.
const TABS = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (a: boolean) => (
      <svg viewBox="0 0 24 24" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth={a ? 0 : 1.7} />
        {a
          ? <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="currentColor" />
          : <polyline points="9 22 9 12 15 12 15 22" strokeWidth="1.7" />
        }
      </svg>
    ),
  },
  {
    href: "/matches",
    label: "Matches",
    icon: (a: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4l2.5 2.5" />
      </svg>
    ),
    showBadge: true, // shows pending payment count
  },
  {
    href: "/teams",
    label: "Teams",
    icon: (_a: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href: "/tournaments",
    label: "Tournaments",
    icon: (_a: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
        <path d="M8 21h8M12 17v4M7 4H17l-1 8a5 5 0 01-8 0L7 4z" />
        <path d="M4 4h3M17 4h3" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (_a: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated } = useAuth();
  const { pendingPayments } = useMatch();

  useEffect(() => { setMounted(true); }, []);

  const urgentCount = isAuthenticated ? pendingPayments.length : 0;

  return (
    <nav className="bottom-nav" aria-label="Main navigation" suppressHydrationWarning>
      <div className="bottom-nav__inner">
        {TABS.map(({ href, label, icon, ...rest }) => {
          const active = mounted && (pathname === href || pathname.startsWith(href + "/"));
          const showBadge = "showBadge" in rest && rest.showBadge && urgentCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`bottom-nav__item${active ? " bottom-nav__item--active" : ""}`}
              aria-current={active ? "page" : undefined}
              suppressHydrationWarning
            >
              <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {icon(active)}
                {showBadge && (
                  <span style={{
                    position: "absolute", top: -4, right: -6,
                    minWidth: 16, height: 16, borderRadius: 8,
                    background: "var(--red)", color: "#fff",
                    fontSize: 9, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 4px", lineHeight: 1,
                  }}>
                    {urgentCount > 9 ? "9+" : urgentCount}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
