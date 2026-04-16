import { NextResponse } from "next/server";

import { updateMatchSchema } from "@/lib/validators";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const payload = updateMatchSchema.parse(await request.json());

    const { data: existing, error: existingError } = await admin
      .from("matches")
      .select("*")
      .eq("id", payload.matchId)
      .single();

    if (existingError || !existing) {
      throw new Error("Match not found.");
    }

    if (existing.captain_id !== user.id) {
      throw new Error("Only the captain can update this match.");
    }

    let updatedMatch = existing;
    const updates = {
      title: payload.title,
      venue_name: payload.venueName,
      venue_address: payload.venueAddress,
      payment_due_at: payload.paymentDueAt ?? undefined,
      lock_at: payload.lockAt ?? undefined,
      notes: payload.notes ?? undefined,
    };

    const hasFieldUpdates = Object.values(updates).some((value) => value !== undefined);

    if (hasFieldUpdates) {
      const { data: patched, error: patchError } = await admin
        .from("matches")
        .update(updates)
        .eq("id", payload.matchId)
        .select("*")
        .single();

      if (patchError || !patched) {
        throw new Error(patchError?.message ?? "Could not update match.");
      }

      updatedMatch = patched;
    }

    if (payload.nextState && payload.nextState !== updatedMatch.status) {
      const { data: transitioned, error: transitionError } = await admin.rpc("transition_match_state", {
        p_match_id: payload.matchId,
        p_next_state: payload.nextState,
        p_actor: user.id,
      });

      if (transitionError) {
        throw new Error(transitionError.message);
      }

      updatedMatch = transitioned;
    }

    return NextResponse.json({ match: updatedMatch });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update match." },
      { status: 400 },
    );
  }
}
