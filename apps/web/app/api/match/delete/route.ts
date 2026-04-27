import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

// DELETE /api/match/delete?matchId=xxx
// Only the captain can delete. Soft-deletes by setting status to CANCELLED,
// or hard-deletes DRAFT matches that have no participants yet.
export async function DELETE(req: NextRequest) {
  try {
    const matchId = req.nextUrl.searchParams.get("matchId");
    if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(req);

    // Verify ownership
    const { data: match, error: matchErr } = await admin
      .from("matches")
      .select("id, captain_id, status")
      .eq("id", matchId)
      .single();

    if (matchErr || !match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if ((match.captain_id as string) !== user.id) {
      return NextResponse.json({ error: "Only the captain can delete this match" }, { status: 403 });
    }

    // Count participants
    const { count } = await admin
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("match_id", matchId)
      .in("status", ["CONFIRMED", "LOCKED", "PAYMENT_PENDING"]);

    if ((count ?? 0) > 0) {
      // Soft delete — mark CANCELLED (preserves payment records)
      const { error } = await admin
        .from("matches")
        .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
        .eq("id", matchId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ deleted: false, cancelled: true });
    }

    // Hard delete — no participants, safe to remove
    const { error } = await admin.from("matches").delete().eq("id", matchId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: true, cancelled: false });

  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
