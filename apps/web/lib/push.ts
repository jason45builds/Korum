/**
 * Korum Push Notification Sender — server-side utility.
 * web-push is an optional dependency loaded at runtime only.
 * No build-time reference to the package — zero compile errors if not installed.
 *
 * Install when ready: npm install web-push --workspace @korum/web
 * Then add to Vercel env: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 */

import { createAdminClient } from "@/services/supabase/server";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  icon?: string;
  badge?: string;
};

type PushSubscriptionRow = {
  endpoint: string;
  p256dh:   string | null;
  auth:     string | null;
};

// Inline type for web-push so we never import the package at type-check time
type WebPushLib = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
  ) => Promise<{ statusCode: number }>;
};

export async function sendPushNotification(
  userId:  string,
  payload: PushPayload,
): Promise<void> {
  const vapidPublic  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:hello@korum.app";

  if (!vapidPublic || !vapidPrivate) {
    console.warn("[Korum Push] VAPID keys not configured — skipping push");
    return;
  }

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId) as { data: PushSubscriptionRow[] | null };

  if (!subs?.length) return;

  // Load web-push dynamically — if not installed, silently skip
  let webpush: WebPushLib | null = null;
  try {
    // eslint-disable-next-line no-new-func
    const loader = new Function("p", "return import(p)") as (p: string) => Promise<{ default?: WebPushLib } & WebPushLib>;
    const mod    = await loader("web-push").catch(() => null);
    webpush      = mod?.default ?? mod ?? null;
  } catch {
    // package not installed — no-op
  }

  if (!webpush) {
    console.warn("[Korum Push] web-push not installed. Run: npm install web-push --workspace @korum/web");
    return;
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const data = JSON.stringify({
    title:              payload.title,
    body:               payload.body,
    url:                payload.url               ?? "/dashboard",
    tag:                payload.tag               ?? "korum",
    requireInteraction: payload.requireInteraction ?? false,
    icon:               payload.icon              ?? "/icons/icon-192.svg",
    badge:              payload.badge             ?? "/icons/icon-72.svg",
  });

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush!.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh ?? "", auth: sub.auth ?? "" },
        },
        data,
      ).catch(async (err: { statusCode?: number }) => {
        if (err.statusCode === 410) {
          // Subscription expired — clean it up
          await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
        throw err;
      })
    )
  );

  const failed = results.filter(r => r.status === "rejected").length;
  if (failed > 0) {
    console.warn(`[Korum Push] ${failed}/${subs.length} push(es) failed for user ${userId}`);
  }
}

export const PushTemplates = {
  paymentReceived: (playerName: string, matchTitle: string, matchId: string): PushPayload => ({
    title: "💰 Payment received",
    body:  `${playerName} has confirmed for ${matchTitle}`,
    url:   `/match/control?matchId=${matchId}`,
    tag:   `payment-${matchId}`,
  }),
  squadFull: (matchTitle: string, matchId: string): PushPayload => ({
    title: "🔒 Squad is full!",
    body:  `${matchTitle} — time to lock the squad`,
    url:   `/match/control?matchId=${matchId}`,
    tag:   `squad-full-${matchId}`,
    requireInteraction: true,
  }),
  paymentDeadline: (matchTitle: string, matchId: string, hoursLeft: number): PushPayload => ({
    title: "⏰ Payment deadline soon",
    body:  `${hoursLeft}h left to pay for ${matchTitle}`,
    url:   `/match/payment?matchId=${matchId}`,
    tag:   `deadline-${matchId}`,
    requireInteraction: true,
  }),
  matchReminder: (matchTitle: string, matchId: string, timeStr: string): PushPayload => ({
    title: "🏏 Match today!",
    body:  `${matchTitle} starts ${timeStr}. You're in the squad.`,
    url:   `/match/${matchId}`,
    tag:   `reminder-${matchId}`,
  }),
  availabilityRequest: (date: string, teamName: string): PushPayload => ({
    title: "📋 Are you available?",
    body:  `${teamName} captain is checking who's free on ${date}`,
    url:   "/availability",
    tag:   `avail-${date}`,
  }),
};
