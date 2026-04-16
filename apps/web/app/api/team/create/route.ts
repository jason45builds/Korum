import { NextResponse } from "next/server";

import { createTeamSchema } from "@/lib/validators";
import {
  assertTeamCaptain,
  createAdminClient,
  requireAuthenticatedUser,
} from "@/services/supabase/server";
import { createSlug } from "@korum/utils/helpers";

const createUniqueSlug = async (admin: ReturnType<typeof createAdminClient>, name: string) => {
  const base = createSlug(name);
  let slug = base;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const { data } = await admin.from("teams").select("id").eq("slug", slug).maybeSingle();

    if (!data) {
      return slug;
    }

    slug = `${base}-${Date.now().toString().slice(-4)}-${attempt}`;
  }

  return `${base}-${Date.now()}`;
};

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const payload = createTeamSchema.parse(await request.json());

    const slug = await createUniqueSlug(admin, payload.name);

    const { data: team, error: teamError } = await admin
      .from("teams")
      .insert({
        name: payload.name,
        slug,
        sport: payload.sport,
        city: payload.city,
        captain_id: user.id,
      })
      .select("*")
      .single();

    if (teamError || !team) {
      throw new Error(teamError?.message ?? "Could not create team.");
    }

    const { error: membershipError } = await admin.from("memberships").upsert(
      {
        team_id: team.id,
        user_id: user.id,
        role: "CAPTAIN",
        is_active: true,
      },
      { onConflict: "team_id,user_id" },
    );

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    await admin
      .from("users")
      .update({ role: "captain" })
      .eq("id", user.id);

    await assertTeamCaptain(admin, team.id, user.id);

    return NextResponse.json({ team });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create team." },
      { status: 400 },
    );
  }
}
