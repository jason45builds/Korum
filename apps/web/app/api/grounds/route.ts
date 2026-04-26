import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/grounds?city=&sport=&lat=&lng=&date=
export async function GET(req: NextRequest) {
  const sp    = req.nextUrl.searchParams;
  const city  = sp.get("city") ?? "";
  const sport = sp.get("sport") ?? "";
  const lat   = parseFloat(sp.get("lat") ?? "");
  const lng   = parseFloat(sp.get("lng") ?? "");

  const admin = createAdminClient();
  let q = admin.from("grounds").select("*").eq("is_active", true);
  if (city)  q = q.ilike("city", `%${city}%`);
  if (sport) q = q.contains("sport", [sport]);

  const { data, error } = await q.order("is_verified", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let grounds = data ?? [];
  if (!isNaN(lat) && !isNaN(lng)) {
    grounds = grounds
      .map(g => ({
        ...g,
        distance: (g.lat && g.lng) ? haversine(lat, lng, Number(g.lat), Number(g.lng)) : 9999,
      }))
      .sort((a, b) => a.distance - b.distance);
  }

  return NextResponse.json({ grounds });
}

// POST /api/grounds — register a ground
export async function POST(req: NextRequest) {
  const admin = createAdminClient();
  const { user } = await requireAuthenticatedUser(req);
  const body = await req.json() as Record<string, unknown>;

  const { data, error } = await admin.from("grounds").insert({
    owner_id:       user.id,
    name:           body.name,
    sport:          body.sport ?? [],
    address:        body.address,
    city:           body.city,
    state:          body.state ?? null,
    lat:            body.lat ?? null,
    lng:            body.lng ?? null,
    price_per_hour: body.pricePerHour ?? null,
    capacity:       body.capacity ?? null,
    surface:        body.surface ?? null,
    amenities:      body.amenities ?? [],
    contact_phone:  body.contactPhone ?? null,
    contact_email:  body.contactEmail ?? null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ground: data });
}
