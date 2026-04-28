import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/services/supabase/server";

// GET /api/team/preview?inviteCode=ABC123
// Public endpoint — returns team info for the invite link page.
// Works without authentication so anyone can preview before signing in.

export async function GET(req: NextRequest) {
  const inviteCode = req.nextUrl.searchParams.get("inviteCode")?.trim().toUpperCase();
  if (!inviteCode) {
    return NextResponse.json({ error: "inviteCode required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch team with captain name and member count
  const { data: team, error } = await admin
    .from("teams")
    .select(`
      id, name, sport, city, invite_code,
      captain:users!teams_captain_id_fkey(display_name, full_name),
      memberships(count)
    `)
    .eq("invite_code", inviteCode)
    .single();

  if (error || !team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Check if the calling user is already a member (best-effort — no error if not authed)
  let isAlreadyMember = false;
  try {
    const { data: { user } } = await admin.auth.getUser(
      req.headers.get("authorization")?.replace("Bearer ", "") ?? ""
    );
    if (user) {
      const { data: membership } = await admin
        .from("memberships")
        .select("id")
        .eq("team_id", team.id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      isAlreadyMember = !!membership;
    }
  } catch { /* not authenticated — that's fine */ }

  const cap = team.captain as { display_name?: string; full_name?: string } | null;
  const mems = team.memberships as { count?: number }[] | null;

  return NextResponse.json({
    team: {
      id:              team.id,
      name:            team.name,
      sport:           team.sport,
      city:            team.city,
      inviteCode:      team.invite_code,
      captainName:     cap?.display_name ?? cap?.full_name ?? "Captain",
      memberCount:     mems?.[0]?.count ?? 0,
      isAlreadyMember,
    },
  });
}
