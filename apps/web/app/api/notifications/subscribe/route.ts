import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

// POST /api/notifications/subscribe
// Saves a Web Push subscription to the database so the server can send
// push notifications to this device.
export async function POST(req: NextRequest) {
  try {
    const { user }   = await requireAuthenticatedUser(req);
    const admin      = createAdminClient();
    const subscription = await req.json() as PushSubscriptionJSON;

    if (!subscription.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    // Upsert — same endpoint can re-subscribe after SW re-install
    const { error } = await admin
      .from("push_subscriptions")
      .upsert({
        user_id:       user.id,
        endpoint:      subscription.endpoint,
        p256dh:        subscription.keys?.p256dh ?? null,
        auth:          subscription.keys?.auth ?? null,
        updated_at:    new Date().toISOString(),
      }, { onConflict: "endpoint" });

    if (error) {
      // Table may not exist yet — fail gracefully
      console.warn("[push-subscribe] DB error (table may not exist):", error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[push-subscribe]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
