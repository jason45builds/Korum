/**
 * Korum Push Notification Sender
 * Server-side utility for sending Web Push notifications to users.
 *
 * Usage:
 *   import { sendPushNotification } from "@/lib/push";
 *   await sendPushNotification(userId, { title: "Payment received", body: "Rahul has paid ₹200", url: "/match/control?matchId=..." });
 *
 * VAPID keys must be set:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT (e.g. mailto:hello@korum.app)
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
  p256dh: string | null;
  auth: string | null;
};

export async function sendPushNotification(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  const vapidPublic  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:hello@korum.app";

  if (!vapidPublic || !vapidPrivate) {
    console.warn("[Korum Push] VAPID keys not configured — push not sent");
    return;
  }

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId) as { data: PushSubscriptionRow[] | null };

  if (!subs?.length) return;

  const data = JSON.stringify({
    title:             payload.title,
    body:              payload.body,
    url:               payload.url ?? "/dashboard",
    tag:               payload.tag ?? "korum",
    requireInteraction: payload.requireInteraction ?? false,
    icon:              payload.icon  ?? "/icons/icon-192.svg",
    badge:             payload.badge ?? "/icons/icon-72.svg",
  });

  // Dynamic import of web-push (optional dependency)
  let webpush: typeof import("web-push") | null = null;
  try {
    webpush = await import("web-push");
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  } catch {
    console.warn("[Korum Push] web-push not installed. Run: npm install web-push --workspace @korum/web");
    return;
  }

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush!.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh ?? "",
            auth:   sub.auth   ?? "",
          },
        },
        data,
      ).catch(async (err) => {
        // 410 Gone = subscription expired — clean it up
        if (err.statusCode === 410) {
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

/**
 * Common notification templates
 */
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
