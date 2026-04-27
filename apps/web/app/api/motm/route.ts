import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

// GET /api/motm?matchId=xxx — get MOTM votes + result
export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

  const admin = createAdminClient();
  const { user } = await requireAuthenticatedUser(req);

  const { data: votes } = await admin
    .from("motm_votes")
    .select("nominee_id, voter_id, users!nominee_id(full_name, display_name, avatar_url)")
    .eq("match_id", matchId);

  const tally: Record<string, { name: string; avatar: string | null; count: number }> = {};
  for (const v of (votes ?? [])) {
    const userRaw = v.users as unknown;
    const u = Array.isArray(userRaw) ? (userRaw[0] as { full_name: string; display_name: string; avatar_url: string | null } | undefined) : (userRaw as { full_name: string; display_name: string; avatar_url: string | null } | null);
    const name = u?.display_name ?? u?.full_name ?? "Player";
    if (!tally[v.nominee_id as string]) tally[v.nominee_id as string] = { name, avatar: u?.avatar_url ?? null, count: 0 };
    tally[v.nominee_id as string].count++;
  }

  const myVote = (votes ?? []).find(v => (v.voter_id as string) === user.id);
  const sorted = Object.entries(tally).sort((a, b) => b[1].count - a[1].count);

  return NextResponse.json({
    votes: sorted.map(([id, data]) => ({ userId: id, ...data })),
    myVote: myVote?.nominee_id ?? null,
    totalVotes: (votes ?? []).length,
    winner: sorted[0] ? { userId: sorted[0][0], ...sorted[0][1] } : null,
  });
}

// POST /api/motm — cast or change vote
export async function POST(req: NextRequest) {
  try {
    const { matchId, nomineeId } = await req.json() as { matchId: string; nomineeId: string };
    if (!matchId || !nomineeId) return NextResponse.json({ error: "matchId and nomineeId required" }, { status: 400 });

    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(req);

    // Verify voter is a participant
    const { count } = await admin
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("match_id", matchId)
      .eq("user_id", user.id)
      .in("status", ["CONFIRMED", "LOCKED"]);

    if (!count) return NextResponse.json({ error: "Only match participants can vote" }, { status: 403 });

    await admin.from("motm_votes").upsert({
      match_id:   matchId,
      voter_id:   user.id,
      nominee_id: nomineeId,
      voted_at:   new Date().toISOString(),
    }, { onConflict: "match_id,voter_id" });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
