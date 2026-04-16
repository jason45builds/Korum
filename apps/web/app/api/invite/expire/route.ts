import { NextResponse } from "next/server";

import { inviteExpireSchema } from "@/lib/validators";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const payload = inviteExpireSchema.parse(await request.json().catch(() => ({})));

    if (payload.matchId) {
      const { data: match, error: matchError } = await admin
        .from("matches")
        .select("captain_id")
        .eq("id", payload.matchId)
        .single();

      if (matchError || !match) {
        throw new Error("Match not found.");
      }

      if (match.captain_id !== user.id) {
        throw new Error("Only the captain can expire invites for this match.");
      }
    }

    const { data: expiredCount, error } = await admin.rpc("expire_match_invites", {
      p_match_id: payload.matchId ?? null,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ expiredCount: expiredCount ?? 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not expire invites." },
      { status: 400 },
    );
  }
}
