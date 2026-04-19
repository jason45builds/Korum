import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/services/supabase/server";

const schema = z.object({
  matchId: z.string().uuid(),
  name:    z.string().min(1).max(80),
});

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const body  = schema.parse(await request.json());

    await admin.from("guest_participants")
      .update({ status: "CLAIMED_PAID", claimed_paid_at: new Date().toISOString() })
      .eq("match_id", body.matchId)
      .eq("display_name", body.name)
      .eq("status", "PENDING_PAYMENT");

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}
