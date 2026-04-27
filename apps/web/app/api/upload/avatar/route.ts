import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(req);

    const formData = await req.formData();
    const file = formData.get("avatar") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (!["image/jpeg","image/png","image/webp"].includes(file.type))
      return NextResponse.json({ error: "Only JPG, PNG, or WebP allowed" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });

    const ext  = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `avatars/${user.id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await admin.storage
      .from("avatars")
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    const { data: { publicUrl } } = admin.storage.from("avatars").getPublicUrl(path);

    await admin.from("users")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    return NextResponse.json({ avatarUrl: publicUrl });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 500 });
  }
}
