"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications", { credentials: "same-origin" });
        if (!res.ok) return;
        const d = await res.json() as { unread: number };
        setUnread(d.unread ?? 0);
      } catch { /* ignore */ }
    };
    void load();
    // Poll every 60s while app is open
    const iv = setInterval(() => void load(), 60_000);
    return () => clearInterval(iv);
  }, [isAuthenticated]);

  return (
    <Link href="/activity" className="app-header__icon-btn" aria-label="Notifications" style={{ position: "relative" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      {unread > 0 && (
        <span style={{
          position: "absolute", top: 2, right: 2,
          minWidth: 16, height: 16, borderRadius: "var(--r-full)",
          background: "var(--red)", color: "#fff",
          fontSize: 10, fontWeight: 800, fontFamily: "var(--font-display)",
          display: "grid", placeItems: "center", padding: "0 4px",
          lineHeight: 1,
        }}>
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
