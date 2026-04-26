import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

// GET /api/notifications — fetch user's notifications
export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  const { user } = await requireAuthenticatedUser(req);

  const { data, error } = await admin
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [], unread: (data ?? []).filter(n => !n.is_read).length });
}

// PATCH /api/notifications — mark as read
export async function PATCH(req: NextRequest) {
  const { ids, all } = await req.json() as { ids?: string[]; all?: boolean };
  const admin = createAdminClient();
  const { user } = await requireAuthenticatedUser(req);

  let q = admin.from("notifications").update({ is_read: true }).eq("user_id", user.id);
  if (!all && ids?.length) q = q.in("id", ids);

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
