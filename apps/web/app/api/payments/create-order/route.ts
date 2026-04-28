import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

// POST /api/payments/create-order
// Returns Razorpay order OR manual UPI fallback
// Korum platform fee: 2% added on top of match fee (absorbed into Razorpay amount)

const KORUM_FEE_RATE = 0.02; // 2% platform fee

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const body = await req.json() as { matchId: string };
    if (!body.matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

    const admin = createAdminClient();

    // Load match + captain UPI in one query
    const { data: match, error: mErr } = await admin
      .from("matches")
      .select(`
        id, title, price_per_player, captain_id, status,
        captain:users!matches_captain_id_fkey(display_name, full_name, upi_id, upi_name)
      `)
      .eq("id", body.matchId)
      .single();

    if (mErr || !match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    // Only allow payment if match is in a payable state
    if (!["RSVP_OPEN", "PAYMENT_PENDING"].includes(match.status as string)) {
      return NextResponse.json({ error: "Match is not accepting payments" }, { status: 400 });
    }

    // Check player is a participant
    const { data: participant } = await admin
      .from("match_participants")
      .select("id, status, payment_status")
      .eq("match_id", body.matchId)
      .eq("user_id", user.id)
      .single();

    if (!participant) {
      return NextResponse.json({ error: "You are not in this match. Join first." }, { status: 400 });
    }

    if (participant.payment_status === "PAID") {
      return NextResponse.json({ error: "You have already paid for this match." }, { status: 400 });
    }

    // Check for existing unpaid payment row — reuse if exists
    const { data: existingPayment } = await admin
      .from("payments")
      .select("id, gateway_order_id, status")
      .eq("match_id", body.matchId)
      .eq("user_id", user.id)
      .in("status", ["CREATED", "PENDING"])
      .maybeSingle();

    const matchFee = match.price_per_player as number;

    // Free match — auto-confirm
    if (matchFee === 0) {
      await admin
        .from("match_participants")
        .update({ status: "CONFIRMED", payment_status: "PAID", updated_at: new Date().toISOString() })
        .eq("match_id", body.matchId)
        .eq("user_id", user.id);
      return NextResponse.json({ mode: "free" });
    }

    const keyId     = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const razorpayReady = Boolean(keyId && keySecret && keyId !== "YOUR_RAZORPAY_KEY_ID" && keySecret !== "YOUR_RAZORPAY_KEY_SECRET");

    // ── MANUAL UPI FALLBACK ──────────────────────────────────────────────────
    if (!razorpayReady) {
      const captain = match.captain as { display_name?: string; full_name?: string; upi_id?: string; upi_name?: string } | null;
      return NextResponse.json({
        mode: "manual_upi",
        amount: matchFee,
        captainName: captain?.upi_name ?? captain?.display_name ?? captain?.full_name ?? "Captain",
        upiId: captain?.upi_id ?? null,
        matchTitle: match.title,
        participantId: participant.id,
      });
    }

    // ── RAZORPAY ─────────────────────────────────────────────────────────────
    // Add platform fee to the amount player pays (Razorpay collects full amount)
    const platformFee  = Math.round(matchFee * KORUM_FEE_RATE);
    const totalAmount  = matchFee + platformFee;
    const amountPaise  = Math.round(totalAmount * 100);

    // Reuse existing Razorpay order if available and not expired
    if (existingPayment?.gateway_order_id) {
      return NextResponse.json({
        mode: "razorpay",
        paymentId: existingPayment.id,
        orderId: existingPayment.gateway_order_id,
        amount: amountPaise,
        currency: "INR",
        keyId,
        matchId: body.matchId,
        matchTitle: match.title,
        matchFee,
        platformFee,
      });
    }

    const receipt = `k_${body.matchId.slice(0, 12)}_${user.id.slice(0, 8)}`;

    // Create Razorpay order
    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt,
        notes: {
          matchId: body.matchId,
          userId: user.id,
          participantId: participant.id,
          matchFee: String(matchFee),
          platformFee: String(platformFee),
        },
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.json() as { error?: { description?: string } };
      return NextResponse.json(
        { error: err?.error?.description ?? "Razorpay order creation failed" },
        { status: 502 }
      );
    }

    const rzpOrder = await orderRes.json() as { id: string; amount: number };

    // Upsert payment row
    const { data: payment, error: pErr } = await admin
      .from("payments")
      .upsert({
        match_id: body.matchId,
        user_id: user.id,
        amount: totalAmount,
        currency: "INR",
        status: "CREATED",
        receipt,
        gateway_order_id: rzpOrder.id,
      }, { onConflict: "match_id,user_id" })
      .select("id")
      .single();

    if (pErr || !payment) {
      return NextResponse.json({ error: "Failed to create payment record" }, { status: 500 });
    }

    return NextResponse.json({
      mode: "razorpay",
      paymentId: payment.id,
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: "INR",
      keyId,
      matchId: body.matchId,
      matchTitle: match.title,
      matchFee,
      platformFee,
    });

  } catch (e) {
    console.error("[create-order]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
