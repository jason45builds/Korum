import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

// POST /api/payments/verify
// Called client-side after Razorpay checkout modal succeeds
// Verifies HMAC signature then delegates to finalize_match_payment()

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
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

    // ── Verify Razorpay HMAC signature ───────────────────────────────────────
    const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
    const expected  = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      console.error("[verify] Signature mismatch", { expected, received: razorpay_signature });
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const admin = createAdminClient();

    // ── Delegate to the DB function — atomic, handles race conditions ─────────
    const { data: result, error: fnErr } = await admin.rpc("finalize_match_payment", {
      p_match_id:            matchId,
      p_user_id:             user.id,
      p_payment_id:          paymentId,
      p_gateway_order_id:    razorpay_order_id,
      p_gateway_payment_id:  razorpay_payment_id,
      p_gateway_signature:   razorpay_signature,
    });

    if (fnErr) {
      console.error("[verify] finalize_match_payment error", fnErr);
      return NextResponse.json({ error: fnErr.message }, { status: 500 });
    }

    const res = result as { result: string; participantStatus?: string; paymentStatus?: string };

    // Auto-advance match to PAYMENT_PENDING if still RSVP_OPEN
    const { data: match } = await admin
      .from("matches")
      .select("status, squad_size")
      .eq("id", matchId)
      .single();

    if (match?.status === "RSVP_OPEN") {
      await admin.rpc("transition_match_state", {
        p_match_id:   matchId,
        p_next_state: "PAYMENT_PENDING",
        p_actor:      user.id,
      }).then(() => {}).catch(() => {});
    }

    // Check if squad now full → auto-lock
    if (match && ["PAYMENT_PENDING", "RSVP_OPEN"].includes(match.status as string)) {
      const { count } = await admin
        .from("match_participants")
        .select("id", { count: "exact", head: true })
        .eq("match_id", matchId)
        .in("status", ["CONFIRMED", "LOCKED"]);

      if ((count ?? 0) >= (match.squad_size as number)) {
        await admin.rpc("transition_match_state", {
          p_match_id:   matchId,
          p_next_state: "LOCKED",
          p_actor:      user.id,
        }).then(() => {}).catch(() => {});
      }
    }

    // Fire notification to captain
    if (res.result === "CONFIRMED") {
      const { data: participant } = await admin
        .from("match_participants")
        .select("users!inner(display_name, full_name)")
        .eq("match_id", matchId)
        .eq("user_id", user.id)
        .single();

      const playerName = (participant?.users as { display_name?: string; full_name?: string } | null)?.display_name
        ?? (participant?.users as { display_name?: string; full_name?: string } | null)?.full_name
        ?? "A player";

      const { data: matchRow } = await admin
        .from("matches")
        .select("captain_id")
        .eq("id", matchId)
        .single();

      if (matchRow?.captain_id) {
        await admin.from("notifications").insert({
          user_id:  matchRow.captain_id,
          type:     "payment_confirmed",
          title:    "Payment received",
          body:     `${playerName} has paid and confirmed their spot.`,
          match_id: matchId,
        });
      }
    }

    return NextResponse.json({ success: true, result: res.result });

  } catch (e) {
    console.error("[verify]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
