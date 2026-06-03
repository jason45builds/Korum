/**
 * Korum Analytics — lightweight event tracking.
 * PostHog is loaded dynamically only when NEXT_PUBLIC_POSTHOG_KEY is set.
 * Falls back to console.log in dev. Zero build-time dependency on posthog-js.
 */

type EventName =
  | "auth_started" | "auth_completed" | "auth_failed"
  | "match_created" | "match_viewed" | "match_joined"
  | "match_payment_started" | "match_payment_completed" | "match_payment_failed"
  | "match_squad_locked" | "match_shared_whatsapp"
  | "team_created" | "team_joined" | "team_invite_copied" | "team_invite_shared"
  | "tournament_viewed" | "tournament_created" | "tournament_registration_started"
  | "availability_marked" | "availability_responded"
  | "ground_viewed" | "vendor_viewed" | "marketplace_location_enabled"
  | "pwa_install_prompted" | "pwa_installed"
  | "push_permission_granted" | "push_permission_denied"
  | "motm_vote_cast" | "strategy_room_opened" | "help_opened" | "search_performed";

type Props = Record<string, string | number | boolean | null | undefined>;

// Singleton — captured once after dynamic init
let _capture: ((event: string, props?: Props) => void) | null = null;
let _identify: ((id: string, traits?: Record<string, string | number | boolean | null>) => void) | null = null;
let _initStarted = false;

async function initPostHog() {
  if (_initStarted || typeof window === "undefined") return;
  _initStarted = true;

  const key  = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";
  if (!key) return;

  try {
    // Dynamic import — not referenced at build time, so no missing-module error
    const mod = await import(/* webpackIgnore: true */ "posthog-js").catch(() => null);
    if (!mod) return;

    const ph = mod.default ?? mod;
    ph.init(key, {
      api_host:                host,
      capture_pageview:        true,
      capture_pageleave:       true,
      persistence:             "localStorage+cookie",
      autocapture:             false,
      disable_session_recording: true,
      loaded(instance: { capture: (e: string, p?: Props) => void; identify: (id: string, t?: Record<string, string | number | boolean | null>) => void }) {
        _capture  = (e, p) => instance.capture(e, p);
        _identify = (id, t) => instance.identify(id, t);
      },
    });
  } catch {
    // PostHog unavailable — silent degradation
  }
}

// Kick off init on client immediately
if (typeof window !== "undefined") {
  void initPostHog();
}

export function track(event: EventName, properties?: Props): void {
  if (typeof window === "undefined") return;

  if (process.env.NODE_ENV === "development") {
    console.log("[Korum Analytics]", event, properties ?? "");
  }

  _capture?.(event, { ...properties, app: "korum-web" });
}

export function identify(
  userId: string,
  traits?: Record<string, string | number | boolean | null>,
): void {
  if (typeof window === "undefined") return;

  if (process.env.NODE_ENV === "development") {
    console.log("[Korum Analytics] identify", userId, traits ?? "");
  }

  _identify?.(userId, traits);
}
