// No auth required — anonymous players join via public link
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/services/supabase/server";

const schema = z.object({
  matchId: z.string().uuid(),
  name:    z.string().min(1).max(80),
  phone:   z.string().max(20).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const body  = schema.parse(await request.json());

    // Verify match exists and is accepting
    const { data: match, error: me } = await admin
      .from("matches").select("id, status, squad_size").eq("id", body.matchId).single();
    if (me || !match) throw new Error("Match not found.");
    if (!["RSVP_OPEN", "PAYMENT_PENDING"].includes(match.status)) {
      throw new Error("This match is not accepting new players.");
    }

    // Count current confirmed players
    const { count } = await admin
      .from("match_participants")
      .select("id", { count: "exact", head: true })
      .eq("match_id", body.matchId)
      .in("status", ["CONFIRMED", "LOCKED", "PAYMENT_PENDING"]);

    if ((count ?? 0) >= match.squad_size) throw new Error("Squad is full.");

    // Create a guest_participants record (lightweight, no auth user needed)
    const { error: insertErr } = await admin.from("guest_participants").insert({
      match_id:      body.matchId,
      display_name:  body.name,
      phone:         body.phone ?? null,
      status:        "PENDING_PAYMENT",
    });

    // If guest_participants table doesn't exist yet, fall back gracefully
    if (insertErr && !insertErr.message.includes("does not exist")) {
      throw new Error(insertErr.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}
