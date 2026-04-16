import { createHmac, timingSafeEqual } from "crypto";

import { NextResponse } from "next/server";

import { assertServerEnv, env } from "@korum/config/env";
import { verifyPaymentSchema } from "@/lib/validators";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

const isSignatureValid = (orderId: string, paymentId: string, signature: string) => {
  assertServerEnv(["razorpayKeySecret"]);
  const generated = createHmac("sha256", env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return timingSafeEqual(Buffer.from(generated), Buffer.from(signature));
};

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const payload = verifyPaymentSchema.parse(await request.json());

    if (!isSignatureValid(payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature)) {
      throw new Error("Payment signature verification failed.");
    }

    const { data: result, error } = await admin.rpc("finalize_match_payment", {
      p_match_id: payload.matchId,
      p_user_id: user.id,
      p_payment_id: payload.paymentId,
      p_gateway_order_id: payload.razorpay_order_id,
      p_gateway_payment_id: payload.razorpay_payment_id,
      p_gateway_signature: payload.razorpay_signature,
      p_event_id: `client-${payload.razorpay_payment_id}`,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not verify payment." },
      { status: 400 },
    );
  }
}
