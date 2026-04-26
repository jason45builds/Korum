import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/services/supabase/server";

// POST /api/payments/verify
// Called after Razorpay checkout succeeds — verifies signature and confirms participant
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      paymentId: string;
      matchId: string;
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    };

    const { paymentId, matchId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
    if (!paymentId || !matchId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify Razorpay signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
    const digest = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (digest !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Update payment record to PAID
    const { error: payErr } = await supabase
      .from("payments")
      .update({
        status: "PAID",
        gateway_payment_id: razorpay_payment_id,
        gateway_signature: razorpay_signature,
        paid_at: new Date().toISOString(),
      })
      .eq("id", paymentId)
      .eq("user_id", user.id);

    if (payErr) return NextResponse.json({ error: "Payment update failed" }, { status: 500 });

    // Auto-confirm participant
    const { error: partErr } = await supabase
      .from("participants")
      .update({
        status: "CONFIRMED",
        payment_status: "PAID",
      })
      .eq("match_id", matchId)
      .eq("user_id", user.id);

    if (partErr) {
      // Try inserting participant if not already joined
      await supabase.from("participants").insert({
        match_id: matchId,
        user_id: user.id,
        status: "CONFIRMED",
        payment_status: "PAID",
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
