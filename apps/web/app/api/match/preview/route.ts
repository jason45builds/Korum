// GET /api/match/preview?matchId=UUID
// Public endpoint — no auth required. Returns enough info to show the /p/ invite page.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/services/supabase/server";

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

  const admin = createAdminClient();

  const { data: match, error } = await admin
    .from("matches")
    .select(`
      id, title, venue_name, starts_at, price_per_player,
      squad_size, status, join_code, captain_id,
      captain:users!matches_captain_id_fkey(display_name, full_name)
    `)
    .eq("id", matchId)
    .single();

  if (error || !match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Count confirmed players (no auth needed — public info)
  const { count: confirmedCount } = await admin
    .from("match_participants")
    .select("id", { count: "exact", head: true })
    .eq("match_id", matchId)
    .in("status", ["CONFIRMED", "LOCKED"]);

  const cap = match.captain as { display_name?: string; full_name?: string } | null;

  return NextResponse.json({
    match: {
      id:             match.id,
      title:          match.title,
      venueName:      match.venue_name,
      startsAt:       match.starts_at,
      pricePerPlayer: Number(match.price_per_player),
      squadSize:      match.squad_size,
      status:         match.status,
      confirmedCount: confirmedCount ?? 0,
      captainName:    cap?.display_name ?? cap?.full_name ?? "Captain",
    },
  });
}
