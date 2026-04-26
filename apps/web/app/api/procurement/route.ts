import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

// GET /api/procurement?teamId= — get all lists for a team
export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  const admin = createAdminClient();
  const { user } = await requireAuthenticatedUser(req);

  const { data: lists, error } = await admin
    .from("procurement_lists")
    .select(`
      id, title, status, created_at, created_by,
      procurement_items (
        id, name, description, estimated_cost, target_amount, collected_amount, vendor_id,
        procurement_votes ( vote, user_id ),
        procurement_contributions ( amount, user_id )
      )
    `)
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich each item with vote counts and whether current user voted
  const enriched = (lists ?? []).map(list => ({
    ...list,
    items: (list.procurement_items ?? []).map((item: Record<string, unknown>) => {
      const votes = (item.procurement_votes as Array<{ vote: string; user_id: string }>) ?? [];
      const contribs = (item.procurement_contributions as Array<{ amount: number; user_id: string }>) ?? [];
      return {
        ...item,
        votesNeeded:    votes.filter(v => v.vote === "NEEDED").length,
        votesNotNeeded: votes.filter(v => v.vote === "NOT_NEEDED").length,
        myVote:         votes.find(v => v.user_id === user.id)?.vote ?? null,
        totalContributed: contribs.reduce((s, c) => s + Number(c.amount), 0),
        myContribution: contribs.filter(c => c.user_id === user.id).reduce((s, c) => s + Number(c.amount), 0),
        procurement_votes: undefined,
        procurement_contributions: undefined,
      };
    }),
  }));

  return NextResponse.json({ lists: enriched });
}

// POST /api/procurement — create a list OR add an item OR vote OR contribute
export async function POST(req: NextRequest) {
  const admin = createAdminClient();
  const { user } = await requireAuthenticatedUser(req);
  const body = await req.json() as Record<string, unknown>;
  const action = body.action as string;

  if (action === "create_list") {
    const { data, error } = await admin.from("procurement_lists").insert({
      team_id:    body.teamId,
      match_id:   body.matchId ?? null,
      title:      body.title,
      created_by: user.id,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ list: data });
  }

  if (action === "add_item") {
    const { data, error } = await admin.from("procurement_items").insert({
      list_id:        body.listId,
      vendor_id:      body.vendorId ?? null,
      name:           body.name,
      description:    body.description ?? null,
      estimated_cost: body.estimatedCost ?? null,
      target_amount:  body.targetAmount ?? null,
      created_by:     user.id,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data });
  }

  if (action === "vote") {
    const { error } = await admin.from("procurement_votes").upsert({
      item_id: body.itemId,
      user_id: user.id,
      vote:    body.vote,
    }, { onConflict: "item_id,user_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "contribute") {
    const amount = Number(body.amount);
    if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const { error: cErr } = await admin.from("procurement_contributions").insert({
      item_id: body.itemId,
      user_id: user.id,
      amount,
      note: body.note ?? null,
    });
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    // Update collected_amount on item
    await admin.rpc("increment_collected", { p_item_id: body.itemId, p_amount: amount });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
