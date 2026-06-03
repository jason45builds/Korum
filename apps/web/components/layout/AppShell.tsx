"use client";

import { useEffect } from "react";
import { usePWA } from "@/hooks/usePWA";
import { PWAInstallBanner } from "@/components/shared/PWAInstallBanner";
import { useAuth } from "@/hooks/useAuth";
import { identify, track } from "@/lib/analytics";

/**
 * AppShell — client component that wraps the app.
 * Handles: SW registration, analytics identity, PWA banner.
 * Kept separate from layout.tsx so the server component stays clean.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, isAuthenticated } = useAuth();

  // Register service worker
  usePWA();

  // Identify user in analytics once authenticated
  useEffect(() => {
    if (!isAuthenticated || !profile) return;
    identify(profile.id, {
      role: profile.role ?? "player",
      city: profile.city ?? "",
      sport: profile.defaultSport ?? "",
    });
  }, [isAuthenticated, profile?.id]);

  // Track page views manually (PostHog autocapture is off)
  useEffect(() => {
    const handleRoute = () => {
      track("match_viewed", { path: window.location.pathname });
    };
    window.addEventListener("popstate", handleRoute);
    return () => window.removeEventListener("popstate", handleRoute);
  }, []);

  return (
    <>
      {children}
      <PWAInstallBanner />
    </>
  );
}
