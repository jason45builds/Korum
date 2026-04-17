import { NextResponse } from "next/server";
import { Buffer } from "buffer";

import { createReceiptId } from "@/lib/helpers";
import { createOrderSchema } from "@/lib/validators";
import { createPaymentHoldExpiry } from "@/services/core/paymentRules";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const payload = createOrderSchema.parse(await request.json());

    const { data: match, error: matchError } = await admin
      .from("matches")
      .select("*")
      .eq("id", payload.matchId)
      .single();

    if (matchError || !match) throw new Error("Match not found.");

    if (!["RSVP_OPEN", "PAYMENT_PENDING"].includes(match.status)) {
      throw new Error("Match is not accepting payments.");
    }

    const { data: existingParticipant } = await admin
      .from("match_participants")
      .select("*")
      .eq("match_id", payload.matchId)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: reservedParticipant, error: reserveError } = await admin.rpc("reserve_match_slot", {
      p_match_id: payload.matchId,
      p_user_id: user.id,
      p_expires_at: createPaymentHoldExpiry(),
      p_invite_id: existingParticipant?.invite_id ?? null,
    });

    if (reserveError || !reservedParticipant) {
      throw new Error(reserveError?.message ?? "Could not reserve a payment window.");
    }

    const receipt = createReceiptId(payload.matchId, user.id);
    const amount = Number(match.price_per_player);
    const currency = "INR";

    const { data: paymentRecord, error: paymentCreateError } = await admin
      .from("payments")
      .upsert(
        {
          match_id: payload.matchId,
          user_id: user.id,
          participant_id: reservedParticipant.id,
          amount,
          currency,
          status: amount === 0 ? "PAID" : "CREATED",
          receipt,
        },
        { onConflict: "match_id,user_id" },
      )
      .select("*")
      .single();

    if (paymentCreateError || !paymentRecord) {
      throw new Error(paymentCreateError?.message ?? "Could not create payment record.");
    }

    if (paymentRecord.status === "PAID" && paymentRecord.gateway_payment_id) {
      return NextResponse.json({ alreadyPaid: true, paymentId: paymentRecord.id, matchId: payload.matchId });
    }

    if (amount === 0) {
      const { data: finalized, error: finalizeError } = await admin.rpc("finalize_match_payment", {
        p_match_id: payload.matchId,
        p_user_id: user.id,
        p_payment_id: paymentRecord.id,
        p_gateway_order_id: `free-order-${paymentRecord.id}`,
        p_gateway_payment_id: `free-payment-${paymentRecord.id}`,
        p_gateway_signature: "FREE_MATCH",
        p_event_id: `free-${paymentRecord.id}`,
      });

      if (finalizeError) throw new Error(finalizeError.message);

      return NextResponse.json({
        alreadyPaid: true,
        freeMatch: true,
        paymentId: paymentRecord.id,
        matchId: payload.matchId,
        result: finalized,
      });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error("Payment gateway not configured.");
    }

    const razorpayAuthHeader = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${razorpayAuthHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency,
        receipt,
        notes: { matchId: payload.matchId, userId: user.id, paymentId: paymentRecord.id },
      }),
    });

    const order = (await razorpayResponse.json()) as { id?: string; error?: { description?: string } };

    if (!razorpayResponse.ok || !order.id) {
      throw new Error(order.error?.description ?? "Could not create Razorpay order.");
    }

    await admin.from("payments")
      .update({ gateway_order_id: order.id, status: "PENDING", receipt, participant_id: reservedParticipant.id })
      .eq("id", paymentRecord.id);

    return NextResponse.json({
      paymentId: paymentRecord.id,
      orderId: order.id,
      amount,
      currency,
      keyId: razorpayKeyId,
      receipt,
      matchId: payload.matchId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create payment order." },
      { status: 400 },
    );
  }
}
