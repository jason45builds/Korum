import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

// POST /api/participants/claim-paid
// Player claims they've manually paid via UPI — sets PAYMENT_PENDING for captain review
// Notifies captain so they can verify and confirm

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const { matchId } = await req.json() as { matchId: string };
    if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

    const admin = createAdminClient();

    // Verify match exists and is in a payable state
    const { data: match } = await admin
      .from("matches")
      .select("id, title, captain_id, status, price_per_player")
      .eq("id", matchId)
      .single();

    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    if (!["RSVP_OPEN", "PAYMENT_PENDING"].includes(match.status as string)) {
      return NextResponse.json({ error: "Match is not accepting payments" }, { status: 400 });
    }

    // Upsert participant as PAYMENT_PENDING
    const { error: partErr } = await admin
      .from("match_participants")
      .upsert({
        match_id:       matchId,
        user_id:        user.id,
        status:         "PAYMENT_PENDING",
        payment_status: "PENDING",
        joined_at:      new Date().toISOString(),
        updated_at:     new Date().toISOString(),
      }, { onConflict: "match_id,user_id" });

    if (partErr) return NextResponse.json({ error: partErr.message }, { status: 500 });

    // Create a pending payment record so captain can see it
    await admin
      .from("payments")
      .upsert({
        match_id: matchId,
        user_id:  user.id,
        amount:   match.price_per_player as number,
        currency: "INR",
        status:   "PENDING",
        receipt:  `upi_claim_${matchId.slice(0, 12)}_${user.id.slice(0, 8)}`,
      }, { onConflict: "match_id,user_id" });

    // Get player name for notification
    const { data: playerProfile } = await admin
      .from("users")
      .select("display_name, full_name")
      .eq("id", user.id)
      .single();

    const playerName = (playerProfile as { display_name?: string; full_name?: string } | null)?.display_name
      ?? (playerProfile as { display_name?: string; full_name?: string } | null)?.full_name
      ?? "A player";

    // Notify captain
    if (match.captain_id) {
      await admin.from("notifications").insert({
        user_id:  match.captain_id,
        type:     "payment_claimed",
        title:    "💰 Payment claimed",
        body:     `${playerName} says they've paid ₹${match.price_per_player} for "${match.title as string}". Verify and confirm.`,
        match_id: matchId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
