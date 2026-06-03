"use client";

import { useEffect } from "react";
import { usePWA } from "@/hooks/usePWA";
import { PWAInstallBanner } from "@/components/shared/PWAInstallBanner";
import { useAuth } from "@/hooks/useAuth";
import { identify, track } from "@/lib/analytics";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, isAuthenticated } = useAuth();

  usePWA();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isAuthenticated || !profile) return;
    identify(profile.id, {
      role:  profile.role         ?? "player",
      city:  profile.city         ?? "",
      sport: profile.defaultSport ?? "",
    });
  // profile.id is the stable key — re-running on full profile object causes loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, profile?.id]);

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
