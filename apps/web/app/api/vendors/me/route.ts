import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

// GET /api/vendors/me — get the vendor profile for the logged-in user
export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(req);
    const { data, error } = await admin.from("vendors").select("*").eq("owner_id", user.id).single();
    if (error || !data) return NextResponse.json({ vendor: null });
    return NextResponse.json({ vendor: data });
  } catch {
    return NextResponse.json({ vendor: null });
  }
}
