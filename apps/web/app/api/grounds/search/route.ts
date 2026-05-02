// GET /api/grounds/search?q=&city=
// Public — returns grounds matching the search query for autocomplete.
// No auth needed so it works before the user has fully signed in.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/services/supabase/server";

export async function GET(req: NextRequest) {
  const q    = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const city = req.nextUrl.searchParams.get("city")?.trim() ?? "";

  if (q.length < 2) return NextResponse.json({ grounds: [] });

  const admin = createAdminClient();
  let query = admin
    .from("grounds")
    .select("id, name, address, city, sport, price_per_hour, surface, is_verified")
    .eq("is_active", true)
    .ilike("name", `%${q}%`);

  if (city) query = query.ilike("city", `%${city}%`);

  const { data, error } = await query.order("is_verified", { ascending: false }).limit(8);
  if (error) return NextResponse.json({ grounds: [] });

  return NextResponse.json({ grounds: data ?? [] });
}
