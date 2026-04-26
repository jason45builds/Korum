import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

// GET /api/messages?matchId=xxx&before=ISO — paginated chat history
export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get("matchId");
  const before  = req.nextUrl.searchParams.get("before"); // cursor for pagination
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

  const admin = createAdminClient();
  const { user } = await requireAuthenticatedUser(req);

  // Verify access: must be a match participant or captain
  const { data: isActor } = await admin.rpc("is_match_actor", { p_match_id: matchId, p_user_id: user.id });
  if (!isActor) return NextResponse.json({ error: "No access" }, { status: 403 });

  let q = admin
    .from("match_messages")
    .select("id, content, created_at, author_id, users!inner(full_name, display_name)")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (before) q = q.lt("created_at", before);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ messages: (data ?? []).reverse() });
}

// POST /api/messages — send a message
export async function POST(req: NextRequest) {
  const { matchId, content } = await req.json() as { matchId: string; content: string };
  if (!matchId || !content?.trim()) return NextResponse.json({ error: "matchId and content required" }, { status: 400 });

  const admin = createAdminClient();
  const { user } = await requireAuthenticatedUser(req);

  const { data: isActor } = await admin.rpc("is_match_actor", { p_match_id: matchId, p_user_id: user.id });
  if (!isActor) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { data, error } = await admin
    .from("match_messages")
    .insert({ match_id: matchId, author_id: user.id, content: content.trim().slice(0, 1000) })
    .select("id, content, created_at, author_id, users!inner(full_name, display_name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data });
}
