import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

export async function GET(request: Request) {
  try {
    const admin = createAdminClient();
    await requireAuthenticatedUser(request);
    const matchId = new URL(request.url).searchParams.get("matchId");
    if (!matchId) throw new Error("matchId required");

    const { data, error } = await admin
      .from("strategy_notes")
      .select("*, users(full_name, display_name)")
      .eq("match_id", matchId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ notes: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const { matchId, content, isPinned } = z.object({
      matchId:  z.string().uuid(),
      content:  z.string().min(1).max(2000),
      isPinned: z.boolean().default(false),
    }).parse(await request.json());

    const { data, error } = await admin
      .from("strategy_notes")
      .insert({ match_id: matchId, author_id: user.id, content, is_pinned: isPinned })
      .select("*, users(full_name, display_name)")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ note: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const { noteId, content, isPinned } = z.object({
      noteId:   z.string().uuid(),
      content:  z.string().min(1).max(2000).optional(),
      isPinned: z.boolean().optional(),
    }).parse(await request.json());

    const updates: Record<string, unknown> = {};
    if (content !== undefined) updates.content = content;
    if (isPinned !== undefined) updates.is_pinned = isPinned;

    const { data, error } = await admin
      .from("strategy_notes")
      .update(updates)
      .eq("id", noteId)
      .eq("author_id", user.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ note: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const noteId = new URL(request.url).searchParams.get("noteId");
    if (!noteId) throw new Error("noteId required");

    const { error } = await admin
      .from("strategy_notes")
      .delete()
      .eq("id", noteId)
      .eq("author_id", user.id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}
