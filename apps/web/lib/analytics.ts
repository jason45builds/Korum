/**
 * Korum Analytics — lightweight event tracking.
 * Uses PostHog if NEXT_PUBLIC_POSTHOG_KEY is set, otherwise logs to console in dev.
 * All events are non-PII — no phone numbers, emails, or names are sent.
 */

type EventName =
  // Auth
  | "auth_started"
  | "auth_completed"
  | "auth_failed"
  // Match
  | "match_created"
  | "match_viewed"
  | "match_joined"
  | "match_payment_started"
  | "match_payment_completed"
  | "match_payment_failed"
  | "match_squad_locked"
  | "match_shared_whatsapp"
  // Team
  | "team_created"
  | "team_joined"
  | "team_invite_copied"
  | "team_invite_shared"
  // Tournament
  | "tournament_viewed"
  | "tournament_created"
  | "tournament_registration_started"
  // Availability
  | "availability_marked"
  | "availability_responded"
  // Marketplace
  | "ground_viewed"
  | "vendor_viewed"
  | "marketplace_location_enabled"
  // PWA
  | "pwa_install_prompted"
  | "pwa_installed"
  | "push_permission_granted"
  | "push_permission_denied"
  // Engagement
  | "motm_vote_cast"
  | "strategy_room_opened"
  | "help_opened"
  | "search_performed";

type EventProperties = Record<string, string | number | boolean | null | undefined>;

let posthog: { capture: (event: string, props?: EventProperties) => void } | null = null;

const initPostHog = async () => {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === "undefined") return;
  try {
    const ph = await import("posthog-js");
    ph.default.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
      capture_pageview: true,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      autocapture: false, // Manual tracking only — more accurate
      disable_session_recording: true,
      loaded(instance) {
        posthog = { capture: (e, p) => instance.capture(e, p) };
      },
    });
  } catch {
    // PostHog not installed — graceful degradation
  }
};

// Init on client
if (typeof window !== "undefined") {
  void initPostHog();
}

export function track(event: EventName, properties?: EventProperties): void {
  if (typeof window === "undefined") return;

  // Always log in dev
  if (process.env.NODE_ENV === "development") {
    console.log("[Korum Analytics]", event, properties ?? "");
  }

  // PostHog
  if (posthog) {
    posthog.capture(event, { ...properties, app: "korum-web" });
    return;
  }
}

export function identify(userId: string, traits?: Record<string, string | number | boolean | null>): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV === "development") {
    console.log("[Korum Analytics] identify", userId, traits ?? "");
  }
}
