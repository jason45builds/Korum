/**
 * Korum Analytics — lightweight event tracking.
 * PostHog is loaded at runtime only when NEXT_PUBLIC_POSTHOG_KEY is set.
 * No build-time dependency — import path is constructed dynamically so
 * TypeScript cannot resolve it at compile time.
 */

type Props = Record<string, string | number | boolean | null | undefined>;

export type EventName =
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

let _capture:  ((event: string, props?: Props) => void) | null = null;
let _identify: ((id: string, traits?: Record<string, string | number | boolean | null>) => void) | null = null;
let _initDone = false;

async function initAnalytics() {
  if (_initDone || typeof window === "undefined") return;
  _initDone = true;

  const key  = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";
  if (!key) return;

  try {
    // Build a dynamic specifier so TypeScript never tries to type-check it.
    // This is equivalent to a lazy CDN load — zero bundle impact when key is absent.
    const pkg = "posthog" + "-js";
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const mod = await (new Function(`return import("${pkg}")`)() as Promise<{ default?: { init: (k: string, o: object) => void; capture: (e: string, p?: Props) => void; identify: (id: string, t?: object) => void } }>).catch(() => null);
    if (!mod) return;

    const ph = mod.default ?? (mod as unknown as NonNullable<typeof mod["default"]>);
    ph.init(key, {
      api_host:                  host,
      capture_pageview:          true,
      capture_pageleave:         true,
      persistence:               "localStorage+cookie",
      autocapture:               false,
      disable_session_recording: true,
    });
    _capture  = (e, p) => ph.capture(e, p);
    _identify = (id, t) => ph.identify(id, t as object);
  } catch {
    // PostHog unavailable — silent no-op
  }
}

if (typeof window !== "undefined") {
  void initAnalytics();
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
