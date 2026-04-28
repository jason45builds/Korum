import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

// POST /api/participants/confirm-payment
// Captain confirms a player's manual UPI payment → marks them CONFIRMED
// GET  /api/participants/confirm-payment?matchId=xxx → lists pending claims for captain

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const matchId = req.nextUrl.searchParams.get("matchId");
    if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

    const admin = createAdminClient();

    const { data: match } = await admin
      .from("matches")
      .select("captain_id")
      .eq("id", matchId)
      .single();

    if (!match || match.captain_id !== user.id) {
      return NextResponse.json({ error: "Only the captain can view payment claims" }, { status: 403 });
    }

    const { data: pending } = await admin
      .from("match_participants")
      .select(`
        id, user_id, status, payment_status, joined_at,
        users!inner(id, full_name, display_name, reliability_score)
      `)
      .eq("match_id", matchId)
      .eq("status", "PAYMENT_PENDING")
      .order("joined_at", { ascending: true });

    return NextResponse.json({ claims: pending ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const { matchId, playerId, action } = await req.json() as {
      matchId: string;
      playerId: string;
      action: "confirm" | "reject";
    };

    if (!matchId || !playerId || !action) {
      return NextResponse.json({ error: "matchId, playerId and action required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: match } = await admin
      .from("matches")
      .select("captain_id, squad_size, price_per_player, title")
      .eq("id", matchId)
      .single();

    if (!match || match.captain_id !== user.id) {
      return NextResponse.json({ error: "Only the captain can confirm payments" }, { status: 403 });
    }

    if (action === "confirm") {
      await admin
        .from("match_participants")
        .update({ status: "CONFIRMED", payment_status: "PAID", updated_at: new Date().toISOString() })
        .eq("match_id", matchId)
        .eq("user_id", playerId);

      await admin
        .from("payments")
        .update({ status: "PAID", paid_at: new Date().toISOString() })
        .eq("match_id", matchId)
        .eq("user_id", playerId)
        .in("status", ["PENDING", "CREATED"]);

      await admin.from("notifications").insert({
        user_id: playerId, type: "payment_confirmed",
        title: "Spot confirmed! ✅",
        body: `Your payment for "${match.title as string}" has been confirmed. You're in!`,
        match_id: matchId,
      });

      // Auto-lock if squad full
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

        await admin.from("notifications").insert({
          user_id: user.id, type: "match_locked",
          title: "Squad locked! 🔒",
          body: "All players confirmed. Your match is locked.",
          match_id: matchId,
        });
      }

      return NextResponse.json({ success: true, action: "confirmed" });

    } else {
      await admin
        .from("match_participants")
        .update({ status: "RSVP", payment_status: "FAILED", updated_at: new Date().toISOString() })
        .eq("match_id", matchId)
        .eq("user_id", playerId);

      await admin.from("notifications").insert({
        user_id: playerId, type: "payment_rejected",
        title: "Payment not verified",
        body: `The captain could not verify your payment for "${match.title as string}". Please try again.`,
        match_id: matchId,
      });

      return NextResponse.json({ success: true, action: "rejected" });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
