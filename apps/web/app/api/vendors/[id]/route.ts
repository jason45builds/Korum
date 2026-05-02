import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/services/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vendors")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  return NextResponse.json({ vendor: data });
}
