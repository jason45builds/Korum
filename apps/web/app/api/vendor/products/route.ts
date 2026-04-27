import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const vendorId = sp.get("vendorId");
  const category = sp.get("category") ?? "";
  const sport    = sp.get("sport") ?? "";

  const admin = createAdminClient();
  let q = admin.from("vendor_products")
    .select("*, vendors(name, city, is_verified, logo_url)")
    .eq("is_active", true);

  if (vendorId) q = q.eq("vendor_id", vendorId);
  if (category) q = q.eq("category", category);
  if (sport)    q = q.contains("sport_tags", [sport]);

  const { data, error } = await q.order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}

export async function POST(req: NextRequest) {
  const admin = createAdminClient();
  const { user } = await requireAuthenticatedUser(req);
  const body = await req.json() as Record<string, unknown>;

  const { data: vendor } = await admin.from("vendors").select("id").eq("owner_id", user.id).single();
  if (!vendor) return NextResponse.json({ error: "You must be a registered vendor" }, { status: 403 });

  const { data, error } = await admin.from("vendor_products").insert({
    vendor_id:   vendor.id,
    name:        body.name,
    description: body.description ?? null,
    category:    body.category,
    price:       Number(body.price),
    unit:        body.unit ?? "item",
    min_qty:     body.minQty ? Number(body.minQty) : 1,
    stock:       body.stock  ? Number(body.stock)  : null,
    image_urls:  body.imageUrls ?? [],
    sport_tags:  body.sportTags ?? [],
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

export async function PATCH(req: NextRequest) {
  const admin = createAdminClient();
  const { user } = await requireAuthenticatedUser(req);
  const body = await req.json() as Record<string, unknown>;
  const productId = body.productId as string;

  const { data: product } = await admin
    .from("vendor_products")
    .select("vendor_id, vendors!inner(owner_id)")
    .eq("id", productId)
    .single();

  if (!product || (product.vendors as { owner_id: string } | null)?.owner_id !== user.id)
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name        !== undefined) updates.name        = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.price       !== undefined) updates.price       = Number(body.price);
  if (body.stock       !== undefined) updates.stock       = body.stock ? Number(body.stock) : null;
  if (body.isActive    !== undefined) updates.is_active   = body.isActive;
  if (body.imageUrls   !== undefined) updates.image_urls  = body.imageUrls;

  const { data, error } = await admin.from("vendor_products").update(updates).eq("id", productId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

export async function DELETE(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });
  const admin = createAdminClient();
  const { user } = await requireAuthenticatedUser(req);

  const { data: product } = await admin
    .from("vendor_products").select("vendor_id, vendors!inner(owner_id)").eq("id", productId).single();
  if (!product || (product.vendors as { owner_id: string } | null)?.owner_id !== user.id)
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  await admin.from("vendor_products").update({ is_active: false }).eq("id", productId);
  return NextResponse.json({ ok: true });
}
