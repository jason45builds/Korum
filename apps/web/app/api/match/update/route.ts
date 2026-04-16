import { NextResponse } from "next/server";

import { updateMatchSchema } from "@/lib/validators";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT:           ["RSVP_OPEN"],
  RSVP_OPEN:       ["PAYMENT_PENDING"],
  PAYMENT_PENDING: ["LOCKED"],
  LOCKED:          ["READY"],
  READY:           [],
};

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

    // Validate state transition before attempting it
    if (payload.nextState && payload.nextState !== existing.status) {
      const allowed = VALID_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(payload.nextState)) {
        throw new Error(
          `Cannot transition from ${existing.status} to ${payload.nextState}. ` +
          `Valid next states: ${allowed.join(", ") || "none"}.`
        );
      }
    }

    let updatedMatch = existing;

    // Apply field updates first
    const updates: Record<string, unknown> = {};
    if (payload.title)        updates.title        = payload.title;
    if (payload.venueName)    updates.venue_name   = payload.venueName;
    if (payload.venueAddress) updates.venue_address = payload.venueAddress;
    if (payload.paymentDueAt !== undefined) updates.payment_due_at = payload.paymentDueAt ?? null;
    if (payload.lockAt !== undefined)       updates.lock_at = payload.lockAt ?? null;
    if (payload.notes !== undefined)        updates.notes = payload.notes ?? null;

    if (Object.keys(updates).length > 0) {
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

    // Apply state transition
    if (payload.nextState && payload.nextState !== updatedMatch.status) {
      const { data: transitioned, error: transitionError } = await admin.rpc(
        "transition_match_state",
        {
          p_match_id:   payload.matchId,
          p_next_state: payload.nextState,
          p_actor:      user.id,
        },
      );

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
