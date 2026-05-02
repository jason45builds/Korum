import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

const createSchema = z.object({
  name:               z.string().min(3).max(80),
  description:        z.string().max(1000).optional().nullable(),
  sport:              z.string().min(2).max(40),
  format:             z.enum(["LEAGUE", "KNOCKOUT", "GROUP_KNOCKOUT", "ROUND_ROBIN"]).default("LEAGUE"),
  city:               z.string().min(2).max(60),
  venueName:          z.string().max(100).optional().nullable(),
  startsOn:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsOn:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  registrationCloses: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  maxTeams:           z.coerce.number().int().min(2).max(64).default(8),
  minTeams:           z.coerce.number().int().min(2).default(4),
  entryFee:           z.coerce.number().min(0).default(0),
  prizePool:          z.coerce.number().min(0).default(0),
  isPublic:           z.boolean().default(true),
});

// GET /api/tournaments?city=&sport=&status=&my=true
export async function GET(req: NextRequest) {
  const sp     = req.nextUrl.searchParams;
  const city   = sp.get("city") ?? "";
  const sport  = sp.get("sport") ?? "";
  const status = sp.get("status") ?? "";
  const my     = sp.get("my") === "true";

  const admin = createAdminClient();

  let q = admin
    .from("tournaments")
    .select("id, name, sport, format, status, city, venue_name, starts_on, ends_on, entry_fee, prize_pool, max_teams, min_teams, is_public, join_code, organizer_id, created_at")
    .order("starts_on", { ascending: true })
    .limit(50);

  if (city)   q = q.ilike("city", `%${city}%`);
  if (sport)  q = q.eq("sport", sport);
  if (status) q = q.eq("status", status);
  else        q = q.neq("status", "CANCELLED");

  if (my) {
    // Requires auth — return organizer's own tournaments
    try {
      const { user } = await requireAuthenticatedUser(req);
      q = q.eq("organizer_id", user.id);
    } catch {
      return NextResponse.json({ tournaments: [] });
    }
  } else {
    q = q.eq("is_public", true);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with registered team count
  const ids = (data ?? []).map(t => t.id);
  const { data: regCounts } = ids.length
    ? await admin
        .from("tournament_registrations")
        .select("tournament_id")
        .in("tournament_id", ids)
        .in("status", ["PENDING", "APPROVED"])
    : { data: [] };

  const countMap = new Map<string, number>();
  (regCounts ?? []).forEach(r => countMap.set(r.tournament_id, (countMap.get(r.tournament_id) ?? 0) + 1));

  return NextResponse.json({
    tournaments: (data ?? []).map(t => ({ ...t, registeredTeams: countMap.get(t.id) ?? 0 })),
  });
}

// POST /api/tournaments — create a tournament
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const admin    = createAdminClient();
    const body     = createSchema.parse(await req.json());

    const { data, error } = await admin
      .from("tournaments")
      .insert({
        organizer_id:        user.id,
        name:                body.name,
        description:         body.description ?? null,
        sport:               body.sport,
        format:              body.format,
        status:              "DRAFT",
        city:                body.city,
        venue_name:          body.venueName ?? null,
        starts_on:           body.startsOn,
        ends_on:             body.endsOn ?? null,
        registration_closes: body.registrationCloses ?? null,
        max_teams:           body.maxTeams,
        min_teams:           body.minTeams,
        entry_fee:           body.entryFee,
        prize_pool:          body.prizePool,
        is_public:           body.isPublic,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ tournament: data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 400 });
  }
}

// PATCH /api/tournaments — update status or details
export async function PATCH(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const admin    = createAdminClient();
    const body = await req.json() as {
      tournamentId: string;
      status?: string;
      name?: string;
      description?: string;
    };

    const { data: existing } = await admin
      .from("tournaments")
      .select("organizer_id")
      .eq("id", body.tournamentId)
      .single();

    if (!existing || existing.organizer_id !== user.id) {
      return NextResponse.json({ error: "Not authorised" }, { status: 403 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status)      updates.status      = body.status;
    if (body.name)        updates.name        = body.name;
    if (body.description) updates.description = body.description;

    const { data, error } = await admin
      .from("tournaments")
      .update(updates)
      .eq("id", body.tournamentId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ tournament: data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 400 });
  }
}
