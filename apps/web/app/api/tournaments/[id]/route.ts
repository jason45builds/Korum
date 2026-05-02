import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

// GET /api/tournaments/[id] — full tournament details with standings, fixtures, registrations
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = createAdminClient();
    const { id } = params;

    const [
      { data: tournament, error: te },
      { data: standings },
      { data: fixtures },
      { data: registrations },
      { data: announcements },
    ] = await Promise.all([
      admin.from("tournaments").select("*").eq("id", id).single(),
      admin.from("tournament_standings")
        .select("*, teams(name, sport, city)")
        .eq("tournament_id", id)
        .order("position", { ascending: true }),
      admin.from("tournament_fixtures")
        .select("*, home:teams!tournament_fixtures_home_team_id_fkey(name), away:teams!tournament_fixtures_away_team_id_fkey(name)")
        .eq("tournament_id", id)
        .order("round", { ascending: true })
        .order("fixture_date", { ascending: true }),
      admin.from("tournament_registrations")
        .select("*, teams(name, sport, city)")
        .eq("tournament_id", id)
        .in("status", ["PENDING", "APPROVED"]),
      admin.from("tournament_announcements")
        .select("*, users(display_name, full_name)")
        .eq("tournament_id", id)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (te || !tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    return NextResponse.json({
      tournament,
      standings:     standings ?? [],
      fixtures:      fixtures ?? [],
      registrations: registrations ?? [],
      announcements: announcements ?? [],
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

// POST /api/tournaments/[id] — register a team
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const admin    = createAdminClient();
    const { teamId } = await req.json() as { teamId: string };

    const { data, error } = await admin.rpc("register_team_for_tournament", {
      p_tournament_id: params.id,
      p_team_id:       teamId,
      p_user_id:       user.id,
    });

    if (error) throw new Error(error.message);
    return NextResponse.json({ registration: data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 400 });
  }
}
