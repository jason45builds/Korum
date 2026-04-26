import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/services/supabase/server";

// POST /api/payments/webhook
// Razorpay webhook — auto-confirms participant on payment.captured event
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

    // Verify webhook signature
    if (webhookSecret && webhookSecret !== "placeholder") {
      const digest = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");
      if (digest !== signature) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    const event = JSON.parse(body) as {
      event: string;
      payload: {
        payment: {
          entity: {
            id: string;
            order_id: string;
            amount: number;
            status: string;
            notes: { matchId?: string; userId?: string };
          };
        };
      };
    };

    if (event.event !== "payment.captured") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const payment = event.payload.payment.entity;
    const { matchId, userId } = payment.notes;
    if (!matchId || !userId) {
      return NextResponse.json({ error: "Missing matchId or userId in notes" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Update payment record
    await supabase
      .from("payments")
      .update({
        status: "PAID",
        gateway_payment_id: payment.id,
        webhook_event_id: event.event,
        paid_at: new Date().toISOString(),
      })
      .eq("gateway_order_id", payment.order_id);

    // Auto-confirm participant (upsert)
    const { error: partErr } = await supabase
      .from("participants")
      .update({ status: "CONFIRMED", payment_status: "PAID" })
      .eq("match_id", matchId)
      .eq("user_id", userId);

    if (partErr) {
      await supabase.from("participants").insert({
        match_id: matchId,
        user_id: userId,
        status: "CONFIRMED",
        payment_status: "PAID",
      });
    }

    // Check if squad is now full → auto-lock
    const { data: match } = await supabase
      .from("matches")
      .select("squad_size, status")
      .eq("id", matchId)
      .single();

    if (match && match.status === "PAYMENT_PENDING") {
      const { count } = await supabase
        .from("participants")
        .select("id", { count: "exact", head: true })
        .eq("match_id", matchId)
        .in("status", ["CONFIRMED", "LOCKED"]);

      if (count && count >= (match.squad_size as number)) {
        await supabase
          .from("matches")
          .update({ status: "LOCKED" })
          .eq("id", matchId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Webhook error" }, { status: 500 });
  }
}
