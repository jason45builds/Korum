import { NextResponse } from "next/server";

import { createMatchSchema } from "@/lib/validators";
import { assertTeamCaptain, createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const payload = createMatchSchema.parse(await request.json());

    await assertTeamCaptain(admin, payload.teamId, user.id);

    const { data: match, error: matchError } = await admin
      .from("matches")
      .insert({
        team_id: payload.teamId,
        captain_id: user.id,
        title: payload.title,
        sport: payload.sport,
        venue_name: payload.venueName,
        venue_address: payload.venueAddress,
        starts_at: payload.startsAt,
        payment_due_at: payload.paymentDueAt ?? null,
        lock_at: payload.lockAt ?? null,
        squad_size: payload.squadSize,
        price_per_player: payload.pricePerPlayer,
        visibility: payload.visibility,
        notes: payload.notes ?? null,
        status: "DRAFT",
      })
      .select("*")
      .single();

    if (matchError || !match) {
      throw new Error(matchError?.message ?? "Could not create match.");
    }

    let outputMatch = match;

    if (payload.publishNow) {
      const { data: transitioned, error: transitionError } = await admin.rpc("transition_match_state", {
        p_match_id: match.id,
        p_next_state: "RSVP_OPEN",
        p_actor: user.id,
      });

      if (transitionError) {
        throw new Error(transitionError.message);
      }

      outputMatch = transitioned;
    }

    return NextResponse.json({ match: outputMatch });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create match." },
      { status: 400 },
    );
  }
}
