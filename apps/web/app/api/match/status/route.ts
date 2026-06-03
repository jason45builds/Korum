import { NextRequest, NextResponse } from "next/server";

import {
  assertTeamMember,
  createAdminClient,
  requireAuthenticatedUser,
} from "@/services/supabase/server";

const DASHBOARD_CUTOFF_DAYS = 60;

type MatchQueryResult = {
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
};

const buildMatchSummaries = async (
  admin: ReturnType<typeof createAdminClient>,
  matches: Record<string, unknown>[],
) => {
  if (matches.length === 0) return [];

  const matchIds = matches.map((m) => m.id as string);
  const { data: participants, error: participantError } = await admin
    .from("match_participants")
    .select("match_id, status, payment_status")
    .in("match_id", matchIds);

  if (participantError) throw new Error(participantError.message);

  return matches.map((match) => {
    const related = (participants ?? []).filter((p) => p.match_id === match.id);
    const confirmedCount = related.filter((p) =>
      ["CONFIRMED", "LOCKED"].includes(p.status),
    ).length;
    const pendingCount = related.filter((p) =>
      ["RSVP", "PAYMENT_PENDING", "WAITLISTED"].includes(p.status),
    ).length;
    const paidCount = related.filter((p) => p.payment_status === "PAID").length;

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
      readinessRatio:
        (match.squad_size as number) > 0
          ? confirmedCount / (match.squad_size as number)
          : 0,
    };
  });
};

export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const matchId  = request.nextUrl.searchParams.get("matchId");
    const joinCode = request.nextUrl.searchParams.get("joinCode");
    const teamId   = request.nextUrl.searchParams.get("teamId");
    const scope    = request.nextUrl.searchParams.get("scope");

    // ── DASHBOARD ─────────────────────────────────────────────────────────
    if (scope === "dashboard") {
      const cutoff = new Date(
        Date.now() - DASHBOARD_CUTOFF_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();

      const [
        { data: memberRows,      error: memberError },
        { data: participantRows, error: participantError },
        { data: captainMatches,  error: captainError },
      ] = await Promise.all([
        admin.from("memberships").select("team_id").eq("user_id", user.id).eq("is_active", true),
        admin.from("match_participants").select("match_id").eq("user_id", user.id),
        admin
          .from("matches")
          .select("*")
          .eq("captain_id", user.id)
          .gte("starts_at", cutoff)
          .order("starts_at", { ascending: false })
          .limit(50),
      ]);

      if (memberError || participantError || captainError) {
        throw new Error(
          memberError?.message ??
          participantError?.message ??
          captainError?.message ??
          "Could not load dashboard.",
        );
      }

      const teamIds  = Array.from(new Set((memberRows  ?? []).map((r) => r.team_id)));
      const matchIds = Array.from(new Set((participantRows ?? []).map((r) => r.match_id)));

      // Use a shared empty-result helper so TypeScript knows error can be non-null
      const empty = (): Promise<MatchQueryResult> =>
        Promise.resolve({ data: [] as Record<string, unknown>[], error: null });

      const [captainSet, teamSet, participantSet]: MatchQueryResult[] =
        await Promise.all([
          // captainMatches already fetched — wrap so the type matches the others
          Promise.resolve({
            data: (captainMatches ?? []) as Record<string, unknown>[],
            error: null as { message: string } | null,
          }),
          teamIds.length
            ? admin
                .from("matches")
                .select("*")
                .in("team_id", teamIds)
                .gte("starts_at", cutoff)
                .order("starts_at", { ascending: false })
                .limit(50)
                .then((r) => r as MatchQueryResult)
            : empty(),
          matchIds.length
            ? admin
                .from("matches")
                .select("*")
                .in("id", matchIds)
                .gte("starts_at", cutoff)
                .order("starts_at", { ascending: false })
                .limit(50)
                .then((r) => r as MatchQueryResult)
            : empty(),
        ]);

      if (captainSet.error ?? teamSet.error ?? participantSet.error) {
        throw new Error(
          captainSet.error?.message ??
          teamSet.error?.message ??
          participantSet.error?.message ??
          "Could not load matches.",
        );
      }

      const mergedMap = new Map<string, Record<string, unknown>>();
      [
        ...(captainSet.data  ?? []),
        ...(teamSet.data     ?? []),
        ...(participantSet.data ?? []),
      ].forEach((m) => mergedMap.set(m.id as string, m));

      const matches = await buildMatchSummaries(admin, Array.from(mergedMap.values()));

      const { data: pendingPayments, error: paymentError } = await admin
        .from("payments")
        .select("id, match_id, amount, currency, status, created_at")
        .eq("user_id", user.id)
        .in("status", ["CREATED", "PENDING", "REFUND_PENDING"]);

      if (paymentError) throw new Error(paymentError.message);

      const pendingPaymentRows = (pendingPayments ?? []).map((p) => ({
        id:        p.id,
        matchId:   p.match_id,
        amount:    Number(p.amount),
        currency:  p.currency,
        status:    p.status,
        createdAt: p.created_at,
      }));

      return NextResponse.json({ matches, pendingPayments: pendingPaymentRows });
    }

    // ── TEAM MATCHES ──────────────────────────────────────────────────────
    if (teamId) {
      await assertTeamMember(admin, teamId, user.id);

      const { data: matches, error } = await admin
        .from("matches")
        .select("*")
        .eq("team_id", teamId)
        .order("starts_at", { ascending: true });

      if (error) throw new Error(error.message);

      const summaries = await buildMatchSummaries(
        admin,
        (matches ?? []) as Record<string, unknown>[],
      );
      return NextResponse.json({ matches: summaries });
    }

    // ── SINGLE MATCH DETAIL ───────────────────────────────────────────────
    let matchQuery = admin.from("matches").select("*").limit(1);
    matchQuery = matchId
      ? matchQuery.eq("id", matchId)
      : matchQuery.eq("join_code", joinCode?.toUpperCase() ?? "");
    const { data: match, error: matchError } = await matchQuery.single();

    if (matchError || !match) throw new Error("Match not found.");

    const [
      { data: isActor,       error: actorError },
      { data: ownParticipant, error: ownParticipantError },
    ] = await Promise.all([
      admin.rpc("is_match_actor", { p_match_id: match.id, p_user_id: user.id }),
      admin
        .from("match_participants")
        .select("id")
        .eq("match_id", match.id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (actorError || ownParticipantError) {
      throw new Error(
        actorError?.message ?? ownParticipantError?.message ?? "Could not verify access.",
      );
    }

    if (!isActor && !ownParticipant && match.visibility !== "PUBLIC") {
      throw new Error("You do not have access to this match.");
    }

    const [
      { data: team },
      { data: captain },
      { data: participantRows, error: participantRowsError },
      { data: inviteRows,      error: inviteError },
    ] = await Promise.all([
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

    if (participantRowsError ?? inviteError) {
      throw new Error(
        participantRowsError?.message ?? inviteError?.message ?? "Could not load match details.",
      );
    }

    const participantUserIds = Array.from(
      new Set((participantRows ?? []).map((r) => r.user_id)),
    );
    const { data: participantUsers, error: participantUserError } = participantUserIds.length
      ? await admin
          .from("users")
          .select("id, full_name, phone, reliability_score")
          .in("id", participantUserIds)
      : { data: [], error: null };

    if (participantUserError) throw new Error(participantUserError.message);

    const userMap = new Map(
      (participantUsers ?? []).map((p) => [p.id, p]),
    );

    const matchDetail = {
      id:           match.id,
      teamId:       match.team_id,
      captainId:    match.captain_id,
      title:        match.title,
      sport:        match.sport,
      venueName:    match.venue_name,
      venueAddress: match.venue_address,
      startsAt:     match.starts_at,
      paymentDueAt: match.payment_due_at,
      lockAt:       match.lock_at,
      squadSize:    match.squad_size,
      pricePerPlayer: Number(match.price_per_player),
      status:       match.status,
      visibility:   match.visibility,
      joinCode:     match.join_code,
      notes:        match.notes,
      createdAt:    match.created_at,
      updatedAt:    match.updated_at,
      teamName:     team?.name    ?? "Unnamed team",
      captainName:  captain?.full_name ?? "Captain",
      participants: (participantRows ?? []).map((participant) => {
        const profile = userMap.get(participant.user_id);
        return {
          participantId:   participant.id,
          userId:          participant.user_id,
          fullName:        profile?.full_name      ?? "Unknown player",
          phone:           profile?.phone          ?? "Hidden",
          status:          participant.status,
          paymentStatus:   participant.payment_status,
          reliabilityScore: Number(profile?.reliability_score ?? 0),
          joinedAt:        participant.joined_at,
          holdExpiresAt:   participant.hold_expires_at,
        };
      }),
      invites: (inviteRows ?? []).map((invite) => ({
        id:           invite.id,
        invitedPhone: invite.invited_phone,
        invitedName:  invite.invited_name,
        status:       invite.status,
        expiresAt:    invite.expires_at,
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
