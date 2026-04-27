import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(req);

    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    if (!["image/jpeg","image/png","image/webp"].includes(file.type))
      return NextResponse.json({ error: "Only JPG, PNG, WebP" }, { status: 400 });
    if (file.size > 8 * 1024 * 1024)
      return NextResponse.json({ error: "Max 8MB" }, { status: 400 });

    const ext    = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path   = `products/${user.id}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await admin.storage.from("products").upload(path, buffer, { contentType: file.type, upsert: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: { publicUrl } } = admin.storage.from("products").getPublicUrl(path);
    return NextResponse.json({ url: publicUrl });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 500 });
  }
}
