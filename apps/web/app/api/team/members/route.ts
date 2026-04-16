import { NextRequest, NextResponse } from "next/server";

import { assertTeamMember, createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

const buildTeamDetails = async (admin: ReturnType<typeof createAdminClient>, teamIds: string[]) => {
  if (teamIds.length === 0) {
    return [];
  }

  const [{ data: teams, error: teamError }, { data: memberships, error: membershipError }] =
    await Promise.all([
      admin.from("teams").select("*").in("id", teamIds),
      admin
        .from("memberships")
        .select("id, team_id, user_id, role, joined_at, is_active")
        .in("team_id", teamIds)
        .eq("is_active", true),
    ]);

  if (teamError) {
    throw new Error(teamError.message);
  }

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const userIds = Array.from(new Set((memberships ?? []).map((membership) => membership.user_id)));
  const { data: users, error: userError } = userIds.length
    ? await admin
        .from("users")
        .select("id, full_name, phone, reliability_score")
        .in("id", userIds)
    : { data: [], error: null };

  if (userError) {
    throw new Error(userError.message);
  }

  const userMap = new Map((users ?? []).map((profile) => [profile.id, profile]));

  return (teams ?? []).map((team) => ({
    id: team.id,
    name: team.name,
    slug: team.slug,
    sport: team.sport,
    city: team.city,
    captainId: team.captain_id,
    inviteCode: team.invite_code,
    createdAt: team.created_at,
    updatedAt: team.updated_at,
    members: (memberships ?? [])
      .filter((membership) => membership.team_id === team.id)
      .map((membership) => {
        const profile = userMap.get(membership.user_id);

        return {
          membershipId: membership.id,
          userId: membership.user_id,
          fullName: profile?.full_name ?? "Unknown player",
          phone: profile?.phone ?? "Hidden",
          reliabilityScore: Number(profile?.reliability_score ?? 0),
          role: membership.role,
          joinedAt: membership.joined_at,
        };
      }),
  }));
};

export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const teamId = request.nextUrl.searchParams.get("teamId");
    const scope = request.nextUrl.searchParams.get("scope");

    if (!teamId || scope === "mine") {
      const { data: memberships, error } = await admin
        .from("memberships")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) {
        throw new Error(error.message);
      }

      const teamIds = Array.from(new Set((memberships ?? []).map((membership) => membership.team_id)));
      const teams = await buildTeamDetails(admin, teamIds);

      return NextResponse.json({ teams });
    }

    await assertTeamMember(admin, teamId, user.id);
    const [team] = await buildTeamDetails(admin, [teamId]);

    return NextResponse.json({ team });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load teams." },
      { status: 400 },
    );
  }
}
