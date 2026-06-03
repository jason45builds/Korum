import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

// POST /api/participants/drop-out
// Player withdraws from a confirmed match — marks as DECLINED and docks reliability
export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(req);

    const body = await req.json() as { matchId?: string };
    const { matchId } = body;
    if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

    // Get participant status first
    const { data: part } = await admin
      .from("match_participants")
      .select("id, status")
      .eq("match_id", matchId)
      .eq("user_id", user.id)
      .single();

    const wasConfirmed = part && ["CONFIRMED", "LOCKED"].includes(part.status as string);

    // Mark as declined
    const { error: updateErr } = await admin
      .from("match_participants")
      .update({ status: "DECLINED", updated_at: new Date().toISOString() })
      .eq("match_id", matchId)
      .eq("user_id", user.id);

    if (updateErr) throw new Error(updateErr.message);

    // If was confirmed = late cancel — record for reliability
    if (wasConfirmed) {
      await admin.from("match_attendance").upsert({
        match_id: matchId,
        user_id: user.id,
        status: "LATE_CANCEL",
        recorded_by: user.id,
      }, { onConflict: "match_id,user_id" });
    }

    // Re-open match if now below squad size
    const { data: match } = await admin
      .from("matches")
      .select("squad_size, status")
      .eq("id", matchId)
      .single();

    if (match && ["LOCKED", "PAYMENT_PENDING"].includes(match.status as string)) {
      const { count } = await admin
        .from("match_participants")
        .select("id", { count: "exact", head: true })
        .eq("match_id", matchId)
        .in("status", ["CONFIRMED", "LOCKED"]);

      if ((count ?? 0) < (match.squad_size as number)) {
        await admin
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
