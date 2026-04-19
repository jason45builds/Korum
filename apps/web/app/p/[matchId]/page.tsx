// Public match page — no auth required
// This is the WhatsApp link destination
// Players see match info and can tap "I'm In" immediately

import { createAdminClient } from "@/services/supabase/server";
import PublicMatchClient from "./PublicMatchClient";

type Props = { params: { matchId: string } };

export const dynamic = "force-dynamic";

export default async function PublicMatchPage({ params }: Props) {
  const admin = createAdminClient();

  const { data: match } = await admin
    .from("matches")
    .select("id, title, sport, venue_name, venue_address, starts_at, squad_size, price_per_player, status, join_code, notes, captain_id")
    .eq("id", params.matchId)
    .maybeSingle();

  if (!match) {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem" }}>🔍</div>
          <h2 style={{ fontFamily: "var(--font-display)", marginTop: "0.5rem" }}>Match not found</h2>
          <p style={{ color: "var(--text-muted)" }}>This link may have expired or the match was removed.</p>
        </div>
      </main>
    );
  }

  // Count confirmed players
  const { data: participants } = await admin
    .from("match_participants")
    .select("status, payment_status")
    .eq("match_id", params.matchId);

  const confirmed = (participants ?? []).filter((p) =>
    ["CONFIRMED", "LOCKED"].includes(p.status)
  ).length;

  const captain = await admin
    .from("users")
    .select("full_name, display_name")
    .eq("id", match.captain_id)
    .maybeSingle();

  return (
    <PublicMatchClient
      match={{
        id: match.id,
        title: match.title,
        sport: match.sport,
        venueName: match.venue_name,
        venueAddress: match.venue_address,
        startsAt: match.starts_at,
        squadSize: match.squad_size,
        pricePerPlayer: Number(match.price_per_player),
        status: match.status,
        joinCode: match.join_code,
        notes: match.notes,
        confirmedCount: confirmed,
        captainName: captain.data?.display_name ?? captain.data?.full_name ?? "Captain",
      }}
    />
  );
}
