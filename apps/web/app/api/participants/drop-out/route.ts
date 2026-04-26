import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/services/supabase/server";

// POST /api/participants/drop-out
// Player withdraws from a confirmed match — marks as DECLINED and docks reliability
export async function POST(req: NextRequest) {
  try {
    const { matchId } = await req.json() as { matchId: string };
    if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Get participant status first
    const { data: part } = await supabase
      .from("participants")
      .select("status")
      .eq("match_id", matchId)
      .eq("user_id", user.id)
      .single();

    const wasConfirmed = part && ["CONFIRMED", "LOCKED"].includes(part.status as string);

    // Mark as declined
    await supabase
      .from("participants")
      .update({ status: "DECLINED", updated_at: new Date().toISOString() })
      .eq("match_id", matchId)
      .eq("user_id", user.id);

    // If was confirmed = late cancel — record for reliability
    if (wasConfirmed) {
      await supabase.from("match_attendance").upsert({
        match_id: matchId,
        user_id: user.id,
        status: "LATE_CANCEL",
        recorded_by: user.id,
      }, { onConflict: "match_id,user_id" });
    }

    // Re-open match to RSVP_OPEN if it was locked and now short
    const { data: match } = await supabase
      .from("matches")
      .select("squad_size, status")
      .eq("id", matchId)
      .single();

    if (match && ["LOCKED", "PAYMENT_PENDING"].includes(match.status as string)) {
      const { count } = await supabase
        .from("participants")
        .select("id", { count: "exact", head: true })
        .eq("match_id", matchId)
        .in("status", ["CONFIRMED", "LOCKED"]);

      if ((count ?? 0) < (match.squad_size as number)) {
        await supabase
          .from("matches")
          .update({ status: "PAYMENT_PENDING" })
          .eq("id", matchId);
      }
    }

    return NextResponse.json({ success: true, wasConfirmed });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
