"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Loader } from "@/components/shared/Loader";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";

type ActivityItem = {
  id: string;
  type: "payment_pending" | "player_joined" | "match_locked" | "match_created" | "availability_check" | "payment_claimed";
  title: string;
  sub: string;
  time: string;
  href: string;
  icon: string;
  urgent?: boolean;
};

function buildActivityFeed(
  matches: ReturnType<typeof useMatch>["dashboardMatches"],
  pendingPayments: ReturnType<typeof useMatch>["pendingPayments"],
  profileId?: string
): ActivityItem[] {
  const items: ActivityItem[] = [];

  // Urgent: pending payments
  for (const p of pendingPayments) {
    items.push({
      id: `pay-${p.id}`, type: "payment_pending",
      title: "Pay to confirm your spot",
      sub: `₹${p.amount} due — your slot is not locked yet`,
      time: p.createdAt ?? "", href: `/match/${p.matchId}`,
      icon: "💰", urgent: true,
    });
  }

  // Match activity
  for (const m of matches) {
    const confirmed = m.confirmedCount ?? 0;
    const total     = m.squadSize ?? 0;
    const isLocked  = m.status === "LOCKED" || m.status === "READY";
    const isCaptain = m.captainId === profileId;
    const pending   = m.pendingCount ?? 0;

    if (isLocked) {
      items.push({
        id: `locked-${m.id}`, type: "match_locked",
        title: `${m.title} is locked`,
        sub: `${confirmed}/${total} confirmed · Match is on`,
        time: m.updatedAt ?? m.createdAt ?? "",
        href: `/match/${m.id}`, icon: "🔒",
      });
    } else if (isCaptain && pending > 0) {
      items.push({
        id: `captain-pending-${m.id}`, type: "payment_claimed",
        title: `${pending} payment${pending > 1 ? "s" : ""} to review`,
        sub: `${m.title} · ${confirmed}/${total} confirmed`,
        time: m.updatedAt ?? "",
        href: `/match/control?matchId=${m.id}`, icon: "📩", urgent: true,
      });
    } else if (!isLocked) {
      items.push({
        id: `filling-${m.id}`, type: "player_joined",
        title: `${m.title}`,
        sub: `${confirmed}/${total} confirmed · ${Math.max(0, total - confirmed)} slots left`,
        time: m.updatedAt ?? m.createdAt ?? "",
        href: isCaptain ? `/match/control?matchId=${m.id}` : `/match/${m.id}`,
        icon: "🏏",
      });
    }
  }

  // Sort: urgent first, then by time desc
  return items.sort((a, b) => {
    if (a.urgent && !b.urgent) return -1;
    if (!a.urgent && b.urgent) return 1;
    return (b.time ?? "").localeCompare(a.time ?? "");
  });
}

function timeAgo(iso: string) {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch { return ""; }
}

export default function ActivityPage() {
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const { dashboardMatches, pendingPayments, loading, loadDashboard } = useMatch();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || loadedRef.current) return;
    // Only load if store is empty — avoids redundant fetch if dashboard already loaded
    if (dashboardMatches.length === 0) {
      loadedRef.current = true;
      void loadDashboard();
    }
  }, [isAuthenticated]);

  if (!authLoading && !isAuthenticated) {
    return (
      <main>
        <div className="page" style={{ alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
          <h2 className="t-h2" style={{ marginBottom: 8 }}>Activity</h2>
          <p className="t-body" style={{ color: "var(--text-3)", marginBottom: 20 }}>
            Sign in to see your match activity and notifications.
          </p>
          <Link href="/dashboard">
            <button className="btn btn--primary">Sign In</button>
          </Link>
        </div>
      </main>
    );
  }

  if (authLoading || loading) return <main><Loader label="Loading activity…" /></main>;

  const feed = buildActivityFeed(dashboardMatches, pendingPayments, profile?.id);

  return (
    <main>
      <div className="page">
        <h1 className="t-h2">Activity</h1>

        {feed.length === 0 ? (
          <div className="card card-pad" style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔔</div>
            <h3 className="t-title" style={{ marginBottom: 8 }}>All quiet</h3>
            <p className="t-body" style={{ color: "var(--text-3)" }}>
              Match updates, payment alerts, and team activity will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {feed.map((item, i) => (
              <Link key={item.id} href={item.href}>
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  padding: "14px 4px",
                  borderBottom: i < feed.length - 1 ? "1px solid var(--line)" : "none",
                  background: item.urgent ? "var(--amber-soft)" : "transparent",
                  borderRadius: item.urgent ? "var(--r-md)" : 0,
                  paddingLeft: item.urgent ? 12 : 4,
                  paddingRight: item.urgent ? 12 : 4,
                  marginBottom: item.urgent ? 4 : 0,
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "var(--r-md)", flexShrink: 0,
                    background: item.urgent ? "rgba(217,119,6,0.15)" : "var(--surface-2)",
                    display: "grid", placeItems: "center", fontSize: 18,
                    border: "1px solid var(--line)",
                  }}>
                    {item.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14,
                      color: item.urgent ? "var(--amber)" : "var(--text)",
                    }}>
                      {item.title}
                    </p>
                    <p className="t-caption" style={{ marginTop: 3 }}>{item.sub}</p>
                  </div>

                  {/* Time + chevron */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                    <span className="t-caption">{timeAgo(item.time)}</span>
                    {item.urgent && (
                      <span className="badge badge-amber" style={{ fontSize: 10 }}>Action</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
