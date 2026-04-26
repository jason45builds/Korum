"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

// AuthPanel — lightweight redirect to the dedicated /auth page.
// This replaces the inline form that was embedded in 12+ pages.
// All auth logic now lives in /auth/page.tsx for consistency.

export function AuthPanel({
  title = "Sign in to continue",
  description,
  reason,
  compact = false,
}: {
  title?: string;
  description?: string;
  reason?: string;
  compact?: boolean;
}) {
  const router   = useRouter();
  const pathname = usePathname();

  const redirectParam = encodeURIComponent(pathname);
  const href = `/auth?redirect=${redirectParam}${reason ? `&reason=${reason}` : ""}`;

  if (compact) {
    return (
      <button
        onClick={() => router.push(href)}
        style={{ width: "100%", minHeight: 48, border: "none", borderRadius: "var(--r-lg)", background: "var(--blue)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
        Sign In
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {title && (
        <div>
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17 }}>{title}</p>
          {description && <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-3)", lineHeight: 1.5 }}>{description}</p>}
        </div>
      )}
      <button
        onClick={() => router.push(href)}
        style={{ width: "100%", minHeight: 52, border: "none", borderRadius: "var(--r-lg)", background: "var(--blue)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg>
        Sign In to Korum
      </button>
      <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-4)", margin: 0 }}>
        Free · No spam · Takes 30 seconds
      </p>
    </div>
  );
}
