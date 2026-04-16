import { NextResponse } from "next/server";

import { matchJoinSchema } from "@/lib/validators";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const payload = matchJoinSchema.parse(await request.json());

    let resolvedMatchId = payload.matchId ?? null;

    if (payload.inviteToken) {
      const { data: invite, error: inviteError } = await admin
        .from("match_invites")
        .select("*")
        .eq("token", payload.inviteToken)
        .maybeSingle();

      if (inviteError || !invite) {
        throw new Error("Invite not found.");
      }

      if (invite.status === "PENDING") {
        const { data: acceptance, error: acceptanceError } = await admin.rpc("accept_match_invite", {
          p_token: payload.inviteToken,
          p_user_id: user.id,
        });

        if (acceptanceError) {
          throw new Error(acceptanceError.message);
        }

        resolvedMatchId = acceptance.matchId;
      } else if (invite.status === "ACCEPTED" && invite.invited_user_id === user.id) {
        resolvedMatchId = invite.match_id;
      } else {
        throw new Error("Invite is no longer active.");
      }
    }

    if (!resolvedMatchId && payload.joinCode) {
      const { data: matchByCode, error } = await admin
        .from("matches")
        .select("id")
        .eq("join_code", payload.joinCode.toUpperCase())
        .maybeSingle();

      if (error || !matchByCode) {
        throw new Error("Match not found.");
      }

      resolvedMatchId = matchByCode.id;
    }

    if (!resolvedMatchId) {
      throw new Error("Match not found.");
    }

    const { data: match, error: matchError } = await admin
      .from("matches")
      .select("*")
      .eq("id", resolvedMatchId)
      .single();

    if (matchError || !match) {
      throw new Error("Match not found.");
    }

    if (!["RSVP_OPEN", "PAYMENT_PENDING"].includes(match.status)) {
      throw new Error("This match is not open for new players.");
    }

    const { data: existingParticipant, error: existingParticipantError } = await admin
      .from("match_participants")
      .select("*")
      .eq("match_id", resolvedMatchId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingParticipantError) {
      throw new Error(existingParticipantError.message);
    }

    if (existingParticipant && ["CONFIRMED", "LOCKED", "PAYMENT_PENDING"].includes(existingParticipant.status)) {
      return NextResponse.json({ match, participant: existingParticipant });
    }

    const { data: participant, error: participantError } = await admin
      .from("match_participants")
      .upsert(
        {
          match_id: resolvedMatchId,
          user_id: user.id,
          status: "RSVP",
          payment_status: existingParticipant?.payment_status ?? "CREATED",
        },
        { onConflict: "match_id,user_id" },
      )
      .select("*")
      .single();

    if (participantError) {
      throw new Error(participantError.message);
    }

    return NextResponse.json({ match, participant });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not join match." },
      { status: 400 },
    );
  }
}
