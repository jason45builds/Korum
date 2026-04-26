import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

const createSchema = z.object({
  teamId:     z.string().uuid(),
  matchDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  matchTime:  z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  venueHint:  z.string().max(200).optional().nullable(),
  note:       z.string().max(500).optional().nullable(),
  expiresAt:  z.string().datetime().optional().nullable(),
});

// GET /api/availability-check?teamId=... — list checks for a team
// GET /api/availability-check?checkId=... — get single check with responses
export async function GET(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const url = new URL(request.url);
    const teamId  = url.searchParams.get("teamId");
    const checkId = url.searchParams.get("checkId");

    if (checkId) {
      // Single check with all responses + member names
      const { data: check, error: ce } = await admin
        .from("availability_checks")
        .select("*")
        .eq("id", checkId)
        .single();
      if (ce || !check) throw new Error("Check not found.");

      const { data: responses, error: re } = await admin
        .from("availability_responses")
        .select("*")
        .eq("check_id", checkId)
        .order("response");
      if (re) throw new Error(re.message);

      const userIds = (responses ?? []).map((r) => r.user_id);
      const { data: users } = userIds.length
        ? await admin.from("users").select("id, full_name, display_name, reliability_score").in("id", userIds)
        : { data: [] };

      const userMap = new Map((users ?? []).map((u) => [u.id, u]));

      return NextResponse.json({
        check,
        responses: (responses ?? []).map((r) => ({
          ...r,
          fullName: userMap.get(r.user_id)?.display_name ?? userMap.get(r.user_id)?.full_name ?? "Unknown",
          reliabilityScore: userMap.get(r.user_id)?.reliability_score ?? 0,
        })),
      });
    }

    if (teamId) {
      const { data: checks, error } = await admin
        .from("availability_checks")
        .select("*")
        .eq("team_id", teamId)
        .order("match_date", { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return NextResponse.json({ checks: checks ?? [] });
    }

    // My pending responses across all teams
    const { data: pending, error: pe } = await admin
      .from("availability_responses")
      .select("*, availability_checks(*)")
      .eq("user_id", user.id)
      .eq("response", "PENDING")
      .order("created_at", { ascending: false });

    if (pe) throw new Error(pe.message);
    return NextResponse.json({ pending: pending ?? [] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}

// POST /api/availability-check — captain creates a check OR player marks their own availability
export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const body = await request.json() as Record<string, unknown>;

    // ── Player-initiated: mark their own availability for captain to see ──
    if (body.playerInitiated === true) {
      const { matchDate, matchTime, status, teamIds } = body as {
        matchDate: string;
        matchTime: string | null;
        status: "AVAILABLE" | "UNAVAILABLE" | "MAYBE";
        teamIds: string[] | null;
      };

      // Get all teams this user belongs to
      const { data: memberships } = await admin
        .from("memberships")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("is_active", true);

      const allTeamIds = (memberships ?? []).map((m: { team_id: string }) => m.team_id);
      const targetTeams = teamIds && teamIds.length > 0 ? teamIds : allTeamIds;

      // Upsert a player_availability record per team
      // We store this as an availability_response against a synthetic key,
      // OR we create a standalone player_availability table entry.
      // For now: insert into a player_availability table (create if not exists via upsert).
      const records = targetTeams.map((teamId: string) => ({
        user_id:    user.id,
        team_id:    teamId,
        match_date: matchDate,
        match_time: matchTime ?? null,
        status,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await admin
        .from("player_availability")
        .upsert(records, { onConflict: "user_id,team_id,match_date" });

      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    // ── Captain-initiated: create check for team ──
    const parsed = createSchema.parse(body);

    const { data: check, error } = await admin.rpc("create_availability_check", {
      p_team_id:    parsed.teamId,
      p_captain_id: user.id,
      p_match_date: parsed.matchDate,
      p_match_time: parsed.matchTime ?? null,
      p_venue_hint: parsed.venueHint ?? null,
      p_note:       parsed.note ?? null,
      p_expires_at: parsed.expiresAt ?? null,
    });

    if (error) throw new Error(error.message);
    return NextResponse.json({ check });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}

// PATCH /api/availability-check — player responds
export async function PATCH(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const { checkId, response, note } = z.object({
      checkId:  z.string().uuid(),
      response: z.enum(["AVAILABLE", "UNAVAILABLE", "MAYBE"]),
      note:     z.string().max(200).optional().nullable(),
    }).parse(await request.json());

    const { data, error } = await admin
      .from("availability_responses")
      .upsert({
        check_id:     checkId,
        user_id:      user.id,
        response,
        note:         note ?? null,
        responded_at: new Date().toISOString(),
      }, { onConflict: "check_id,user_id" })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ response: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}
