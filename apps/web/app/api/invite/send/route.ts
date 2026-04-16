import { NextResponse } from "next/server";

import { buildInviteLink } from "@/lib/helpers";
import { inviteSendSchema } from "@/lib/validators";
import { createInviteExpiry } from "@/services/core/inviteFlow";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const payload = inviteSendSchema.parse(await request.json());

    const { data: match, error: matchError } = await admin
      .from("matches")
      .select("id, captain_id, status")
      .eq("id", payload.matchId)
      .single();

    if (matchError || !match) {
      throw new Error("Match not found.");
    }

    if (match.captain_id !== user.id) {
      throw new Error("Only the captain can send invites.");
    }

    if (!["RSVP_OPEN", "PAYMENT_PENDING"].includes(match.status)) {
      throw new Error("Match is not currently accepting invites.");
    }

    await admin
      .from("match_invites")
      .update({ status: "REVOKED" })
      .eq("match_id", payload.matchId)
      .eq("invited_phone", payload.invitedPhone)
      .eq("status", "PENDING");

    const { data: invite, error: inviteError } = await admin
      .from("match_invites")
      .insert({
        match_id: payload.matchId,
        invited_phone: payload.invitedPhone,
        invited_name: payload.invitedName ?? null,
        invited_by: user.id,
        expires_at: payload.expiresAt ?? createInviteExpiry(),
      })
      .select("*")
      .single();

    if (inviteError || !invite) {
      throw new Error(inviteError?.message ?? "Could not send invite.");
    }

    return NextResponse.json({
      invite,
      shareLink: buildInviteLink(invite.token, payload.matchId),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send invite." },
      { status: 400 },
    );
  }
}
