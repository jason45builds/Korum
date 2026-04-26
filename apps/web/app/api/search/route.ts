import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

// GET /api/search?q=term&type=matches|players|all
export async function GET(req: NextRequest) {
  const q    = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const type = req.nextUrl.searchParams.get("type") ?? "all";

  if (q.length < 2) return NextResponse.json({ matches: [], players: [] });

  const admin = createAdminClient();
  const { user } = await requireAuthenticatedUser(req);
  const term = `%${q}%`;

  const promises: Promise<unknown>[] = [];

  if (type === "all" || type === "matches") {
    promises.push(
      admin
        .from("matches")
        .select("id, title, venue_name, starts_at, sport, squad_size, price_per_player, status, join_code")
        .eq("visibility", "PUBLIC")
        .in("status", ["RSVP_OPEN", "PAYMENT_PENDING"])
        .or(`title.ilike.${term},venue_name.ilike.${term},sport.ilike.${term}`)
        .order("starts_at", { ascending: true })
        .limit(10)
    );
  } else {
    promises.push(Promise.resolve({ data: [], error: null }));
  }

  if (type === "all" || type === "players") {
    promises.push(
      admin
        .from("users")
        .select("id, full_name, display_name, city, default_sport, reliability_score, role")
        .or(`full_name.ilike.${term},display_name.ilike.${term},city.ilike.${term}`)
        .neq("id", user.id)
        .limit(10)
    );
  } else {
    promises.push(Promise.resolve({ data: [], error: null }));
  }

  const [matchRes, playerRes] = await Promise.all(promises) as [
    { data: Record<string, unknown>[] | null; error: { message: string } | null },
    { data: Record<string, unknown>[] | null; error: { message: string } | null },
  ];

  return NextResponse.json({
    matches: (matchRes.data ?? []).map(m => ({
      id: m.id, title: m.title, venueName: m.venue_name,
      startsAt: m.starts_at, sport: m.sport, squadSize: m.squad_size,
      pricePerPlayer: m.price_per_player, status: m.status, joinCode: m.join_code,
    })),
    players: (playerRes.data ?? []).map(p => ({
      id: p.id, fullName: p.full_name, displayName: p.display_name,
      city: p.city, sport: p.default_sport, reliabilityScore: p.reliability_score, role: p.role,
    })),
  });
}
