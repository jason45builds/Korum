import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

// Haversine distance in km between two lat/lng points
function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/vendors?city=&category=&sport=&lat=&lng=
export async function GET(req: NextRequest) {
  const sp       = req.nextUrl.searchParams;
  const city     = sp.get("city") ?? "";
  const category = sp.get("category") ?? "";
  const sport    = sp.get("sport") ?? "";
  const lat      = parseFloat(sp.get("lat") ?? "");
  const lng      = parseFloat(sp.get("lng") ?? "");

  const admin = createAdminClient();

  let q = admin.from("vendors").select("*").eq("is_active", true);
  if (city)     q = q.ilike("city", `%${city}%`);
  if (category) q = q.eq("category", category);
  if (sport)    q = q.contains("sports", [sport]);

  const { data, error } = await q.order("is_verified", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sort by distance if user location provided
  let vendors = data ?? [];
  if (!isNaN(lat) && !isNaN(lng)) {
    vendors = vendors
      .map(v => ({
        ...v,
        distance: (v.lat && v.lng) ? haversine(lat, lng, Number(v.lat), Number(v.lng)) : 9999,
      }))
      .sort((a, b) => a.distance - b.distance);
  }

  return NextResponse.json({ vendors });
}

// POST /api/vendors — register as a vendor
export async function POST(req: NextRequest) {
  const admin = createAdminClient();
  const { user } = await requireAuthenticatedUser(req);
  const body = await req.json() as Record<string, unknown>;

  const { data, error } = await admin.from("vendors").insert({
    owner_id:      user.id,
    name:          body.name,
    category:      body.category,
    description:   body.description ?? null,
    city:          body.city,
    lat:           body.lat ?? null,
    lng:           body.lng ?? null,
    contact_phone: body.contactPhone ?? null,
    contact_email: body.contactEmail ?? null,
    website:       body.website ?? null,
    price_note:    body.priceNote ?? null,
    sports:        body.sports ?? [],
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vendor: data });
}
