// GET /api/team/availability?teamId=&date=
// Captain/admin sees who has marked availability for their team on a given date.
// Returns players who are: AVAILABLE (team-specific or all-teams), MAYBE, UNAVAILABLE, or no response.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const admin    = createAdminClient();
    const teamId   = req.nextUrl.searchParams.get("teamId");
    const date     = req.nextUrl.searchParams.get("date"); // YYYY-MM-DD

    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

    // Verify caller is captain or admin of the team
    const { data: membership } = await admin
      .from("memberships")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership || !["CAPTAIN", "ADMIN"].includes(membership.role as string)) {
      return NextResponse.json({ error: "Only captain or admin can view team availability" }, { status: 403 });
    }

    // Get all active team members
    const { data: members } = await admin
      .from("memberships")
      .select("user_id, role, users!inner(id, display_name, full_name, reliability_score)")
      .eq("team_id", teamId)
      .eq("is_active", true);

    if (!members?.length) return NextResponse.json({ availability: [], date });

    const memberIds = members.map(m => m.user_id);

    // Get player-initiated availability for this team on this date (or all teams)
    // A player's availability counts for this team if:
    //   - they marked it for this specific team, OR
    //   - they marked it for "all teams" (team_ids is empty / null)
    let avQuery = admin
      .from("player_availability")
      .select("user_id, team_id, status, match_date, match_time")
      .in("user_id", memberIds)
      .or(`team_id.eq.${teamId},team_id.is.null`);

    if (date) avQuery = avQuery.eq("match_date", date);
    else avQuery = avQuery.gte("match_date", new Date().toISOString().slice(0, 10))
                          .lte("match_date", new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));

    const { data: avRows } = await avQuery;

    // Map userId → availability
    const avMap = new Map<string, { status: string; match_time: string | null }>();
    (avRows ?? []).forEach(a => {
      // Team-specific takes priority over "all teams"
      const existing = avMap.get(a.user_id);
      if (!existing || a.team_id === teamId) {
        avMap.set(a.user_id, { status: a.status, match_time: a.match_time });
      }
    });

    const availability = members.map(m => {
      const u = (m.users as unknown) as { id: string; display_name?: string; full_name?: string; reliability_score?: number } | null;
      const av = avMap.get(m.user_id);
      return {
        userId:           m.user_id,
        displayName:      u?.display_name ?? u?.full_name ?? "Player",
        role:             m.role,
        reliabilityScore: u?.reliability_score ?? 100,
        status:           av?.status ?? "NO_RESPONSE",
        matchTime:        av?.match_time ?? null,
      };
    });

    // Sort: AVAILABLE first, then MAYBE, then NO_RESPONSE, then UNAVAILABLE
    const order: Record<string, number> = { AVAILABLE: 0, MAYBE: 1, NO_RESPONSE: 2, UNAVAILABLE: 3 };
    availability.sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2));

    return NextResponse.json({ availability, date, teamId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

// GET /api/team/availability?teamId=&range=true — returns summary for next 14 days
export async function POST(req: NextRequest) {
  // Returns date-wise availability counts for calendar heat-map view
  try {
    const { user } = await requireAuthenticatedUser(req);
    const admin    = createAdminClient();
    const { teamId, startDate, endDate } = await req.json() as {
      teamId: string; startDate: string; endDate: string;
    };

    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

    const { data: membership } = await admin
      .from("memberships").select("role")
      .eq("team_id", teamId).eq("user_id", user.id).eq("is_active", true).maybeSingle();

    if (!membership || !["CAPTAIN", "ADMIN"].includes(membership.role as string)) {
      return NextResponse.json({ error: "Not authorised" }, { status: 403 });
    }

    const { count: totalMembers } = await admin
      .from("memberships").select("id", { count: "exact", head: true })
      .eq("team_id", teamId).eq("is_active", true);

    const { data: avRows } = await admin
      .from("player_availability")
      .select("match_date, status, user_id")
      .or(`team_id.eq.${teamId},team_id.is.null`)
      .gte("match_date", startDate)
      .lte("match_date", endDate);

    // Aggregate per date
    const dateMap = new Map<string, { available: number; maybe: number; unavailable: number }>();
    (avRows ?? []).forEach(a => {
      const entry = dateMap.get(a.match_date) ?? { available: 0, maybe: 0, unavailable: 0 };
      if (a.status === "AVAILABLE")   entry.available++;
      if (a.status === "MAYBE")       entry.maybe++;
      if (a.status === "UNAVAILABLE") entry.unavailable++;
      dateMap.set(a.match_date, entry);
    });

    const calendar = Array.from(dateMap.entries()).map(([date, counts]) => ({
      date, ...counts, totalMembers: totalMembers ?? 0,
    }));

    return NextResponse.json({ calendar });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
