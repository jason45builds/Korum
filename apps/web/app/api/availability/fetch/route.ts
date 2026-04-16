import { NextRequest, NextResponse } from "next/server";

import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const matchId = request.nextUrl.searchParams.get("matchId");

    if (!matchId) {
      throw new Error("Match ID is required.");
    }

    const [{ data: match, error: matchError }, { data: participant, error: participantError }, { data: isActor, error: actorError }] =
      await Promise.all([
        admin.from("matches").select("id, visibility").eq("id", matchId).maybeSingle(),
        admin
          .from("match_participants")
          .select("id")
          .eq("match_id", matchId)
          .eq("user_id", user.id)
          .maybeSingle(),
        admin.rpc("is_match_actor", {
          p_match_id: matchId,
          p_user_id: user.id,
        }),
      ]);

    if (matchError || participantError || actorError) {
      throw new Error(matchError?.message || participantError?.message || actorError?.message || "Could not verify access.");
    }

    if (!match) {
      throw new Error("Match not found.");
    }

    if (!isActor && !participant && match.visibility !== "PUBLIC") {
      throw new Error("You do not have access to this availability data.");
    }

    const { data: rows, error } = await admin
      .from("availability")
      .select("*")
      .eq("match_id", matchId)
      .order("slot_starts_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ availability: rows ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not fetch availability." },
      { status: 400 },
    );
  }
}
