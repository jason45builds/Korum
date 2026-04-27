import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

// GET /api/search?q=term&type=all|matches|players|teams|grounds|vendors|tournaments
export async function GET(req: NextRequest) {
  const q    = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const type = req.nextUrl.searchParams.get("type") ?? "all";

  if (q.length < 2) {
    return NextResponse.json({ matches: [], players: [], teams: [], grounds: [], vendors: [], tournaments: [] });
  }

  const admin = createAdminClient();
  const { user } = await requireAuthenticatedUser(req);
  const term = `%${q}%`;

  const isAll      = type === "all";
  const empty      = Promise.resolve({ data: [] as Record<string, unknown>[], error: null });

  const [matchRes, playerRes, teamRes, groundRes, vendorRes, tournamentRes] = await Promise.all([
    // ── Matches ──────────────────────────────────────────────────────────────
    (isAll || type === "matches")
      ? admin
          .from("matches")
          .select("id, title, venue_name, starts_at, sport, squad_size, price_per_player, status, join_code")
          .eq("visibility", "PUBLIC")
          .in("status", ["RSVP_OPEN", "PAYMENT_PENDING"])
          .or(`title.ilike.${term},venue_name.ilike.${term},sport.ilike.${term}`)
          .order("starts_at", { ascending: true })
          .limit(8)
      : empty,

    // ── Players ──────────────────────────────────────────────────────────────
    (isAll || type === "players")
      ? admin
          .from("users")
          .select("id, full_name, display_name, city, default_sport, reliability_score, role")
          .or(`full_name.ilike.${term},display_name.ilike.${term},city.ilike.${term}`)
          .neq("id", user.id)
          .limit(8)
      : empty,

    // ── Teams ─────────────────────────────────────────────────────────────────
    (isAll || type === "teams")
      ? admin
          .from("teams")
          .select(`
            id, name, slug, sport, city, invite_code,
            captain:users!teams_captain_id_fkey(display_name, full_name),
            memberships(count)
          `)
          .or(`name.ilike.${term},sport.ilike.${term},city.ilike.${term}`)
          .limit(8)
      : empty,

    // ── Grounds ───────────────────────────────────────────────────────────────
    (isAll || type === "grounds")
      ? admin
          .from("grounds")
          .select("id, name, city, state, surface, sport, price_per_hour, capacity, amenities, is_verified")
          .eq("is_active", true)
          .or(`name.ilike.${term},city.ilike.${term},state.ilike.${term}`)
          .limit(8)
      : empty,

    // ── Vendors ───────────────────────────────────────────────────────────────
    (isAll || type === "vendors")
      ? admin
          .from("vendors")
          .select("id, name, category, city, description, sports, price_note, is_verified, rating, review_count")
          .eq("is_active", true)
          .or(`name.ilike.${term},category.ilike.${term},city.ilike.${term}`)
          .limit(8)
      : empty,

    // ── Tournaments ──────────────────────────────────────────────────────────
    (isAll || type === "tournaments")
      ? admin
          .from("tournaments")
          .select("id, name, sport, format, city, starts_on, ends_on, status, max_teams, entry_fee, prize_pool")
          .in("status", ["REGISTRATION_OPEN", "ONGOING"])
          .or(`name.ilike.${term},sport.ilike.${term},city.ilike.${term}`)
          .order("starts_on", { ascending: true })
          .limit(8)
      : empty,
  ]);

  return NextResponse.json({
    matches: (matchRes.data ?? []).map(m => ({
      id: m.id, title: m.title, venueName: m.venue_name,
      startsAt: m.starts_at, sport: m.sport, squadSize: m.squad_size,
      pricePerPlayer: m.price_per_player, status: m.status, joinCode: m.join_code,
    })),

    players: (playerRes.data ?? []).map(p => ({
      id: p.id, fullName: p.full_name, displayName: p.display_name,
      city: p.city, sport: p.default_sport,
      reliabilityScore: p.reliability_score, role: p.role,
    })),

    teams: (teamRes.data ?? []).map((t) => {
      const cap = t.captain as { display_name?: string; full_name?: string } | null;
      const mems = t.memberships as { count?: number }[] | null;
      return {
        id: t.id, name: t.name, slug: t.slug, sport: t.sport, city: t.city,
        inviteCode: t.invite_code,
        captainName: cap?.display_name ?? cap?.full_name ?? "Unknown",
        memberCount: mems?.[0]?.count ?? 0,
      };
    }),

    grounds: (groundRes.data ?? []).map(g => ({
      id: g.id, name: g.name, city: g.city, state: g.state,
      surface: g.surface, sport: g.sport,
      pricePerHour: g.price_per_hour, capacity: g.capacity,
      amenities: g.amenities ?? [], isVerified: g.is_verified,
    })),

    vendors: (vendorRes.data ?? []).map(v => ({
      id: v.id, name: v.name, category: v.category, city: v.city,
      description: v.description, sports: v.sports ?? [],
      priceNote: v.price_note, isVerified: v.is_verified,
      rating: v.rating ?? 0, reviewCount: v.review_count ?? 0,
    })),

    tournaments: (tournamentRes.data ?? []).map(t => ({
      id: t.id, name: t.name, sport: t.sport, format: t.format,
      city: t.city, startsOn: t.starts_on, endsOn: t.ends_on,
      status: t.status, maxTeams: t.max_teams,
      entryFee: t.entry_fee, prizePool: t.prize_pool,
    })),
  });
}
