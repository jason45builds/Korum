import { NextRequest, NextResponse } from "next/server";

import {
  assertTeamMember,
  createAdminClient,
  requireAuthenticatedUser,
} from "@/services/supabase/server";

const buildMatchSummaries = async (admin: ReturnType<typeof createAdminClient>, matches: any[]) => {
  if (matches.length === 0) {
    return [];
  }

  const matchIds = matches.map((match) => match.id);
  const { data: participants, error: participantError } = await admin
    .from("match_participants")
    .select("match_id, status, payment_status")
    .in("match_id", matchIds);

  if (participantError) {
    throw new Error(participantError.message);
  }

  return matches.map((match) => {
    const related = (participants ?? []).filter((participant) => participant.match_id === match.id);
    const confirmedCount = related.filter((participant) =>
      ["CONFIRMED", "LOCKED"].includes(participant.status),
    ).length;
    const pendingCount = related.filter((participant) =>
      ["RSVP", "PAYMENT_PENDING", "WAITLISTED"].includes(participant.status),
    ).length;
    const paidCount = related.filter((participant) => participant.payment_status === "PAID").length;

    return {
      id: match.id,
      teamId: match.team_id,
      captainId: match.captain_id,
      title: match.title,
      sport: match.sport,
      venueName: match.venue_name,
      venueAddress: match.venue_address,
      startsAt: match.starts_at,
      paymentDueAt: match.payment_due_at,
      lockAt: match.lock_at,
      squadSize: match.squad_size,
      pricePerPlayer: Number(match.price_per_player),
      status: match.status,
      visibility: match.visibility,
      joinCode: match.join_code,
      notes: match.notes,
      createdAt: match.created_at,
      updatedAt: match.updated_at,
      confirmedCount,
      pendingCount,
      paidCount,
      readinessRatio: match.squad_size > 0 ? confirmedCount / match.squad_size : 0,
    };
  });
};

export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const matchId = request.nextUrl.searchParams.get("matchId");
    const joinCode = request.nextUrl.searchParams.get("joinCode");
    const teamId = request.nextUrl.searchParams.get("teamId");
    const scope = request.nextUrl.searchParams.get("scope");

    if (scope === "dashboard") {
      const [{ data: memberRows, error: memberError }, { data: participantRows, error: participantError }, { data: captainMatches, error: captainError }] =
        await Promise.all([
          admin.from("memberships").select("team_id").eq("user_id", user.id).eq("is_active", true),
          admin.from("match_participants").select("match_id").eq("user_id", user.id),
          admin.from("matches").select("*").eq("captain_id", user.id),
        ]);

      if (memberError || participantError || captainError) {
        throw new Error(memberError?.message || participantError?.message || captainError?.message || "Could not load dashboard.");
      }

      const teamIds = Array.from(new Set((memberRows ?? []).map((row) => row.team_id)));
      const matchIds = Array.from(new Set((participantRows ?? []).map((row) => row.match_id)));
      const queryPromises = [];

      queryPromises.push(Promise.resolve({ data: captainMatches ?? [], error: null }));
      queryPromises.push(
        teamIds.length
          ? admin.from("matches").select("*").in("team_id", teamIds)
          : Promise.resolve({ data: [], error: null }),
      );
      queryPromises.push(
        matchIds.length
          ? admin.from("matches").select("*").in("id", matchIds)
          : Promise.resolve({ data: [], error: null }),
      );

      const [captainSet, teamSet, participantSet] = await Promise.all(queryPromises);

      if (captainSet.error || teamSet.error || participantSet.error) {
        throw new Error(captainSet.error?.message || teamSet.error?.message || participantSet.error?.message || "Could not load matches.");
      }

      const mergedMap = new Map<string, any>();
      [...(captainSet.data ?? []), ...(teamSet.data ?? []), ...(participantSet.data ?? [])].forEach((match) => {
        mergedMap.set(match.id, match);
      });

      const matches = await buildMatchSummaries(admin, Array.from(mergedMap.values()));

      const { data: pendingPayments, error: paymentError } = await admin
        .from("payments")
        .select("id, match_id, amount, currency, status, created_at")
        .eq("user_id", user.id)
        .in("status", ["CREATED", "PENDING", "REFUND_PENDING"]);

      if (paymentError) {
        throw new Error(paymentError.message);
      }

      const pendingPaymentRows = (pendingPayments ?? []).map((payment) => ({
        id: payment.id,
        matchId: payment.match_id,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.created_at,
      }));

      return NextResponse.json({ matches, pendingPayments: pendingPaymentRows });
    }

    if (teamId) {
      await assertTeamMember(admin, teamId, user.id);

      const { data: matches, error } = await admin.from("matches").select("*").eq("team_id", teamId).order("starts_at", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      const summaries = await buildMatchSummaries(admin, matches ?? []);
      return NextResponse.json({ matches: summaries });
    }

    let matchQuery = admin.from("matches").select("*").limit(1);
    matchQuery = matchId ? matchQuery.eq("id", matchId) : matchQuery.eq("join_code", joinCode?.toUpperCase() ?? "");
    const { data: match, error: matchError } = await matchQuery.single();

    if (matchError || !match) {
      throw new Error("Match not found.");
    }

    const [{ data: isActor, error: actorError }, { data: ownParticipant, error: ownParticipantError }] =
      await Promise.all([
        admin.rpc("is_match_actor", {
          p_match_id: match.id,
          p_user_id: user.id,
        }),
        admin
          .from("match_participants")
          .select("id")
          .eq("match_id", match.id)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

    if (actorError || ownParticipantError) {
      throw new Error(actorError?.message || ownParticipantError?.message || "Could not verify access.");
    }

    if (!isActor && !ownParticipant && match.visibility !== "PUBLIC") {
      throw new Error("You do not have access to this match.");
    }

    const [{ data: team }, { data: captain }, { data: participantRows, error: participantRowsError }, { data: inviteRows, error: inviteError }] =
      await Promise.all([
        admin.from("teams").select("name").eq("id", match.team_id).maybeSingle(),
        admin.from("users").select("full_name").eq("id", match.captain_id).maybeSingle(),
        admin
          .from("match_participants")
          .select("id, user_id, status, payment_status, joined_at, hold_expires_at")
          .eq("match_id", match.id)
          .order("joined_at", { ascending: true }),
        admin
          .from("match_invites")
          .select("id, invited_phone, invited_name, status, expires_at")
          .eq("match_id", match.id)
          .order("created_at", { ascending: false }),
      ]);

    if (participantRowsError || inviteError) {
      throw new Error(participantRowsError?.message || inviteError?.message || "Could not load match details.");
    }

    const participantUserIds = Array.from(new Set((participantRows ?? []).map((row) => row.user_id)));
    const { data: participantUsers, error: participantUserError } = participantUserIds.length
      ? await admin
          .from("users")
          .select("id, full_name, phone, reliability_score")
          .in("id", participantUserIds)
      : { data: [], error: null };

    if (participantUserError) {
      throw new Error(participantUserError.message);
    }

    const userMap = new Map((participantUsers ?? []).map((profile) => [profile.id, profile]));
    const matchDetail = {
      id: match.id,
      teamId: match.team_id,
      captainId: match.captain_id,
      title: match.title,
      sport: match.sport,
      venueName: match.venue_name,
      venueAddress: match.venue_address,
      startsAt: match.starts_at,
      paymentDueAt: match.payment_due_at,
      lockAt: match.lock_at,
      squadSize: match.squad_size,
      pricePerPlayer: Number(match.price_per_player),
      status: match.status,
      visibility: match.visibility,
      joinCode: match.join_code,
      notes: match.notes,
      createdAt: match.created_at,
      updatedAt: match.updated_at,
      teamName: team?.name ?? "Unnamed team",
      captainName: captain?.full_name ?? "Captain",
      participants: (participantRows ?? []).map((participant) => {
        const profile = userMap.get(participant.user_id);

        return {
          participantId: participant.id,
          userId: participant.user_id,
          fullName: profile?.full_name ?? "Unknown player",
          phone: profile?.phone ?? "Hidden",
          status: participant.status,
          paymentStatus: participant.payment_status,
          reliabilityScore: Number(profile?.reliability_score ?? 0),
          joinedAt: participant.joined_at,
          holdExpiresAt: participant.hold_expires_at,
        };
      }),
      invites: (inviteRows ?? []).map((invite) => ({
        id: invite.id,
        invitedPhone: invite.invited_phone,
        invitedName: invite.invited_name,
        status: invite.status,
        expiresAt: invite.expires_at,
      })),
    };

    return NextResponse.json({ match: matchDetail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load match status." },
      { status: 400 },
    );
  }
}
