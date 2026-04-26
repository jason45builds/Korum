import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/services/supabase/server";

// POST /api/attendance
// Captain records who showed up. Updates reliability scores automatically via DB trigger.
export async function POST(req: NextRequest) {
  try {
    const { matchId, attendeeIds } = await req.json() as {
      matchId: string;
      attendeeIds: string[]; // user_ids of players who attended
    };
    if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Verify captain
    const { data: match } = await supabase
      .from("matches")
      .select("captain_id, squad_size")
      .eq("id", matchId)
      .single();
    if (!match || (match.captain_id as string) !== user.id) {
      return NextResponse.json({ error: "Only captain can record attendance" }, { status: 403 });
    }

    // Get all confirmed participants
    const { data: participants } = await supabase
      .from("participants")
      .select("user_id")
      .eq("match_id", matchId)
      .in("status", ["CONFIRMED", "LOCKED"]);

    if (!participants) return NextResponse.json({ error: "No participants found" }, { status: 404 });

    const attendeeSet = new Set(attendeeIds);

    // Upsert attendance records for everyone
    const records = participants.map(p => ({
      match_id: matchId,
      user_id: p.user_id as string,
      status: attendeeSet.has(p.user_id as string) ? "ATTENDED" : "NO_SHOW",
      recorded_by: user.id,
    }));

    const { error } = await supabase
      .from("match_attendance")
      .upsert(records, { onConflict: "match_id,user_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Mark match as done
    await supabase
      .from("matches")
      .update({ status: "READY" })
      .eq("id", matchId);

    return NextResponse.json({ success: true, recorded: records.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

// GET /api/attendance?matchId=xxx
// Returns attendance records for a match
export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("match_attendance")
    .select("user_id, status, recorded_at")
    .eq("match_id", matchId);

  return NextResponse.json({ attendance: data ?? [] });
}
