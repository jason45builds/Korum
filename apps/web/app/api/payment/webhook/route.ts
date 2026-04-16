import { createHmac, timingSafeEqual } from "crypto";

import { NextResponse } from "next/server";

import { assertServerEnv, env } from "@korum/config/env";
import { createAdminClient } from "@/services/supabase/server";

const verifyWebhookSignature = (payload: string, signature: string | null) => {
  assertServerEnv(["razorpayWebhookSecret"]);

  if (!signature) {
    throw new Error("Missing Razorpay webhook signature.");
  }

  const generated = createHmac("sha256", env.razorpayWebhookSecret).update(payload).digest("hex");
  return timingSafeEqual(Buffer.from(generated), Buffer.from(signature));
};

export async function POST(request: Request) {
  const admin = createAdminClient();

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const eventId = request.headers.get("x-razorpay-event-id") ?? null;

    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
    }

    const body = JSON.parse(rawBody) as {
      event?: string;
      payload?: {
        payment?: { entity?: Record<string, any> };
        order?: { entity?: Record<string, any> };
      };
    };

    const paymentEntity = body.payload?.payment?.entity ?? {};
    const orderEntity = body.payload?.order?.entity ?? {};
    const notes = (paymentEntity.notes || orderEntity.notes || {}) as Record<string, string>;

    let paymentRecord =
      notes.paymentId
        ? (
            await admin
              .from("payments")
              .select("*")
              .eq("id", notes.paymentId)
              .maybeSingle()
          ).data
        : null;

    if (!paymentRecord && (paymentEntity.order_id || orderEntity.id)) {
      paymentRecord = (
        await admin
          .from("payments")
          .select("*")
          .eq("gateway_order_id", paymentEntity.order_id ?? orderEntity.id)
          .maybeSingle()
      ).data;
    }

    if (!paymentRecord && paymentEntity.id) {
      paymentRecord = (
        await admin
          .from("payments")
          .select("*")
          .eq("gateway_payment_id", paymentEntity.id)
          .maybeSingle()
      ).data;
    }

    if (!paymentRecord) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (body.event === "payment.captured" || body.event === "order.paid") {
      const { error } = await admin.rpc("finalize_match_payment", {
        p_match_id: paymentRecord.match_id,
        p_user_id: paymentRecord.user_id,
        p_payment_id: paymentRecord.id,
        p_gateway_order_id: paymentEntity.order_id ?? orderEntity.id ?? paymentRecord.gateway_order_id,
        p_gateway_payment_id: paymentEntity.id ?? paymentRecord.gateway_payment_id,
        p_gateway_signature: signature,
        p_event_id: eventId,
      });

      if (error) {
        throw new Error(error.message);
      }
    }

    if (body.event === "payment.failed") {
      await admin
        .from("payments")
        .update({
          status: "FAILED",
          gateway_order_id: paymentEntity.order_id ?? paymentRecord.gateway_order_id,
          gateway_payment_id: paymentEntity.id ?? paymentRecord.gateway_payment_id,
          webhook_event_id: eventId,
        })
        .eq("id", paymentRecord.id);

      if (paymentRecord.participant_id) {
        await admin
          .from("match_participants")
          .update({
            status: "RSVP",
            payment_status: "FAILED",
            hold_expires_at: null,
          })
          .eq("id", paymentRecord.participant_id)
          .eq("status", "PAYMENT_PENDING");
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed." },
      { status: 400 },
    );
  }
}
