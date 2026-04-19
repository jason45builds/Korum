import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const admin   = createAdminClient();
    await requireAuthenticatedUser(request);
    const matchId = request.nextUrl.searchParams.get("matchId");
    if (!matchId) throw new Error("matchId required");

    const { data, error } = await admin
      .from("guest_participants")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at");

    if (error) throw new Error(error.message);
    return NextResponse.json({ guests: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin  = createAdminClient();
    await requireAuthenticatedUser(request);
    const { guestId, status, matchId } = z.object({
      guestId:  z.string().uuid(),
      matchId:  z.string().uuid(),
      status:   z.enum(["CONFIRMED", "REJECTED"]),
    }).parse(await request.json());

    const updates: Record<string, unknown> = { status };
    if (status === "CONFIRMED") updates.confirmed_at = new Date().toISOString();

    await admin.from("guest_participants").update(updates).eq("id", guestId).eq("match_id", matchId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}
