import { NextResponse } from "next/server";

import { joinTeamSchema } from "@/lib/validators";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const payload = joinTeamSchema.parse(await request.json());

    let teamQuery = admin.from("teams").select("*").limit(1);
    teamQuery = payload.teamId ? teamQuery.eq("id", payload.teamId) : teamQuery.eq("invite_code", payload.inviteCode);

    const { data: team, error: teamError } = await teamQuery.single();

    if (teamError || !team) {
      throw new Error("Team not found.");
    }

    const { error: membershipError } = await admin.from("memberships").upsert(
      {
        team_id: team.id,
        user_id: user.id,
        role: "PLAYER",
        is_active: true,
      },
      { onConflict: "team_id,user_id" },
    );

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    return NextResponse.json({ team });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not join team." },
      { status: 400 },
    );
  }
}
