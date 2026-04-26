import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/services/supabase/server";

// POST /api/participants/claim-paid
// Player claims they've paid via UPI — marks as PAYMENT_PENDING for captain review
export async function POST(req: NextRequest) {
  try {
    const { matchId } = await req.json() as { matchId: string };
    if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Upsert participant with PAYMENT_PENDING status
    const { error } = await supabase
      .from("participants")
      .upsert({
        match_id: matchId,
        user_id: user.id,
        status: "PAYMENT_PENDING",
        payment_status: "PENDING",
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "match_id,user_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
