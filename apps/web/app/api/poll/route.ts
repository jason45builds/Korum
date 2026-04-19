import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";
import { createClient } from "@supabase/supabase-js";

// Anonymous Supabase client — no auth required for player responses
const getAnonClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
};

// GET /api/poll?token=XXX — public, no auth needed
export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    const db = getAnonClient();

    const { data: link, error: le } = await db
      .from("poll_links")
      .select("*")
      .eq("token", token)
      .single();

    if (le || !link) return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    if (new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: "This poll has expired" }, { status: 410 });
    }

    // Load responses
    const { data: responses } = await db
      .from("anon_responses")
      .select("id, player_name, response, payment_claimed, payment_note, created_at")
      .eq("poll_link_id", link.id)
      .order("created_at");

    // Load match or availability check info
    let matchInfo = null;
    if (link.match_id) {
      const admin = createAdminClient();
      const { data: match } = await admin
        .from("matches")
        .select("id, title, venue_name, starts_at, price_per_player, squad_size, status, join_code")
        .eq("id", link.match_id)
        .single();
      matchInfo = match;
    }

    let checkInfo = null;
    if (link.check_id) {
      const admin = createAdminClient();
      const { data: check } = await admin
        .from("availability_checks")
        .select("id, match_date, match_time, venue_hint, note")
        .eq("id", link.check_id)
        .single();
      checkInfo = check;
    }

    const yes   = (responses ?? []).filter((r) => r.response === "YES").length;
    const no    = (responses ?? []).filter((r) => r.response === "NO").length;
    const maybe = (responses ?? []).filter((r) => r.response === "MAYBE").length;

    return NextResponse.json({
      link: { id: link.id, token: link.token, name: link.name, expiresAt: link.expires_at },
      match: matchInfo,
      check: checkInfo,
      responses: responses ?? [],
      summary: { yes, no, maybe, total: (responses ?? []).length },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

// POST /api/poll — captain creates a poll link
export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);

    const body = z.object({
      checkId:  z.string().uuid().optional(),
      matchId:  z.string().uuid().optional(),
      name:     z.string().max(100).optional(),
      expiresAt: z.string().datetime().optional(),
    }).parse(await request.json());

    const { data: link, error } = await admin
      .from("poll_links")
      .insert({
        check_id:   body.checkId ?? null,
        match_id:   body.matchId ?? null,
        name:       body.name ?? null,
        created_by: user.id,
        expires_at: body.expiresAt ?? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ link });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}

// PATCH /api/poll — player responds (no auth needed)
export async function PATCH(request: Request) {
  try {
    const db = getAnonClient();

    const body = z.object({
      pollLinkId:     z.string().uuid(),
      playerName:     z.string().min(1).max(80),
      playerPhone:    z.string().max(20).optional(),
      response:       z.enum(["YES", "NO", "MAYBE"]),
      paymentClaimed: z.boolean().default(false),
      paymentNote:    z.string().max(200).optional(),
      responseId:     z.string().uuid().optional(), // for updating existing response
    }).parse(await request.json());

    if (body.responseId) {
      // Update existing
      const { data, error } = await db
        .from("anon_responses")
        .update({
          response:        body.response,
          payment_claimed: body.paymentClaimed,
          payment_note:    body.paymentNote ?? null,
        })
        .eq("id", body.responseId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ response: data });
    }

    // New response
    const { data, error } = await db
      .from("anon_responses")
      .insert({
        poll_link_id:    body.pollLinkId,
        player_name:     body.playerName,
        player_phone:    body.playerPhone ?? null,
        response:        body.response,
        payment_claimed: body.paymentClaimed,
        payment_note:    body.paymentNote ?? null,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ response: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}

// DELETE /api/poll?responseId=XXX — captain removes a response
export async function DELETE(request: Request) {
  try {
    const admin = createAdminClient();
    await requireAuthenticatedUser(request);
    const responseId = new URL(request.url).searchParams.get("responseId");
    if (!responseId) throw new Error("responseId required");

    const { error } = await admin.from("anon_responses").delete().eq("id", responseId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}
