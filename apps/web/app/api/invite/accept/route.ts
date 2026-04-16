import { NextResponse } from "next/server";

import { inviteAcceptSchema } from "@/lib/validators";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const payload = inviteAcceptSchema.parse(await request.json());

    const { data: invite, error: inviteError } = await admin
      .from("match_invites")
      .select("*")
      .eq("token", payload.token)
      .maybeSingle();

    if (inviteError || !invite) {
      throw new Error("Invite not found.");
    }

    if (invite.status === "ACCEPTED" && invite.invited_user_id === user.id) {
      return NextResponse.json({
        accepted: true,
        matchId: invite.match_id,
        inviteId: invite.id,
      });
    }

    const { data: result, error } = await admin.rpc("accept_match_invite", {
      p_token: payload.token,
      p_user_id: user.id,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ accepted: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not accept invite." },
      { status: 400 },
    );
  }
}
