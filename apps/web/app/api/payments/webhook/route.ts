import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/services/supabase/server";

// POST /api/payments/webhook
// Razorpay webhook — server-side safety net for payment.captured events
// This fires even if the client-side verify call failed/timed out

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const secret    = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

  // ── Verify webhook signature (required in production) ────────────────────
  if (secret && secret !== "YOUR_RAZORPAY_WEBHOOK_SECRET") {
    const digest = crypto.createHmac("sha256", secret).update(body).digest("hex");
    if (digest !== signature) {
      console.error("[webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  let event: {
    event: string;
    payload: {
      payment: {
        entity: {
          id: string;
          order_id: string;
          amount: number;
          status: string;
          notes: Record<string, string>;
        };
      };
    };
  };

  try {
    event = JSON.parse(body) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only handle payment.captured — ignore all other events
  if (event.event !== "payment.captured") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const payment = event.payload.payment.entity;
  const { matchId, userId, participantId } = payment.notes;

  if (!matchId || !userId) {
    console.error("[webhook] Missing matchId or userId in notes", payment.notes);
    return NextResponse.json({ error: "Missing matchId or userId in notes" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    // Find the payment row by gateway_order_id
    const { data: paymentRow } = await admin
      .from("payments")
      .select("id, status")
      .eq("gateway_order_id", payment.order_id)
      .maybeSingle();

    // Already processed — idempotent
    if (paymentRow?.status === "PAID") {
      return NextResponse.json({ ok: true, skipped: "already_paid" });
    }

    if (!paymentRow) {
      // Payment row missing (rare edge case) — create it
      await admin.from("payments").insert({
        match_id:           matchId,
        user_id:            userId,
        amount:             payment.amount / 100,
        currency:           "INR",
        status:             "PAID",
        gateway_order_id:   payment.order_id,
        gateway_payment_id: payment.id,
        webhook_event_id:   event.event,
        receipt:            `wh_${payment.order_id.slice(-12)}`,
        paid_at:            new Date().toISOString(),
      });
    } else {
      // Use the DB atomic function
      const { error: fnErr } = await admin.rpc("finalize_match_payment", {
        p_match_id:           matchId,
        p_user_id:            userId,
        p_payment_id:         paymentRow.id,
        p_gateway_order_id:   payment.order_id,
        p_gateway_payment_id: payment.id,
        p_gateway_signature:  "", // not available in webhook
        p_event_id:           event.event,
      });

      if (fnErr) {
        console.error("[webhook] finalize_match_payment error", fnErr);
        // Still continue — don't 500 Razorpay or it'll keep retrying
      }
    }

    // Check squad full → auto-lock
    const { data: match } = await admin
      .from("matches")
      .select("squad_size, status, captain_id")
      .eq("id", matchId)
      .single();

    if (match && ["RSVP_OPEN", "PAYMENT_PENDING"].includes(match.status as string)) {
      const { count } = await admin
        .from("match_participants")
        .select("id", { count: "exact", head: true })
        .eq("match_id", matchId)
        .in("status", ["CONFIRMED", "LOCKED"]);

      if ((count ?? 0) >= (match.squad_size as number)) {
        await admin
          .from("matches")
          .update({ status: "LOCKED", locked_at: new Date().toISOString() })
          .eq("id", matchId);

        // Notify captain
        if (match.captain_id) {
          await admin.from("notifications").insert({
            user_id:  match.captain_id,
            type:     "match_locked",
            title:    "Squad locked! 🔒",
            body:     "All players have paid. Your squad is full and the match is locked.",
            match_id: matchId,
          });
        }
      }
    }

    // Notify captain of each payment
    if (match?.captain_id) {
      void Promise.resolve(admin.from("notifications").insert({
        user_id:  match.captain_id,
        type:     "payment_confirmed",
        title:    "Payment received",
        body:     "A player has paid their match fee.",
        match_id: matchId,
      })).catch(() => {});
    }

    console.log("[webhook] Processed payment.captured", { matchId, userId, orderId: payment.order_id });
    return NextResponse.json({ ok: true });

  } catch (e) {
    console.error("[webhook] Error", e);
    // Return 200 to Razorpay so it doesn't retry — log the error separately
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Unknown" });
  }
}
