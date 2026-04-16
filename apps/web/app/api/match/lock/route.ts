import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

const schema = z.object({
  matchId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const payload = schema.parse(await request.json());

    const { data: match, error: matchError } = await admin
      .from("matches")
      .select("*")
      .eq("id", payload.matchId)
      .single();

    if (matchError || !match) {
      throw new Error("Match not found.");
    }

    if (match.captain_id !== user.id) {
      throw new Error("Only the captain can lock the squad.");
    }

    if (match.status !== "PAYMENT_PENDING") {
      throw new Error("Match must be in payment pending before locking.");
    }

    const { data: lockedMatch, error: transitionError } = await admin.rpc("transition_match_state", {
      p_match_id: payload.matchId,
      p_next_state: "LOCKED",
      p_actor: user.id,
    });

    if (transitionError) {
      throw new Error(transitionError.message);
    }

    const { error: participantError } = await admin
      .from("match_participants")
      .update({ status: "LOCKED" })
      .eq("match_id", payload.matchId)
      .eq("payment_status", "PAID")
      .eq("status", "CONFIRMED");

    if (participantError) {
      throw new Error(participantError.message);
    }

    return NextResponse.json({ match: lockedMatch });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not lock squad." },
      { status: 400 },
    );
  }
}
