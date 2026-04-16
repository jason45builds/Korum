import { NextResponse } from "next/server";

import { authProfileSchema } from "@/lib/validators";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

const upsertProfileFromAuth = async (request: Request) => {
  const admin = createAdminClient();
  const { user } = await requireAuthenticatedUser(request);

  const payload = {
    id: user.id,
    phone: user.phone ?? `user-${user.id.slice(0, 8)}`,
    full_name:
      (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
      (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name) ||
      user.phone ||
      "Korum Player",
    display_name:
      (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name) ||
      (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
      user.phone ||
      "Korum Player",
    avatar_url:
      typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
    default_sport:
      typeof user.user_metadata?.default_sport === "string"
        ? user.user_metadata.default_sport
        : null,
    city: typeof user.user_metadata?.city === "string" ? user.user_metadata.city : null,
  };

  const { data, error } = await admin
    .from("users")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export async function GET(request: Request) {
  try {
    const profile = await upsertProfileFromAuth(request);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load profile." },
      { status: 401 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const payload = authProfileSchema.parse(await request.json());

    const { data, error } = await admin
      .from("users")
      .upsert(
        {
          id: user.id,
          phone: user.phone ?? `user-${user.id.slice(0, 8)}`,
          full_name: payload.fullName,
          display_name: payload.displayName ?? payload.fullName,
          default_sport: payload.defaultSport ?? null,
          city: payload.city ?? null,
          role: payload.role ?? "player",
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save profile." },
      { status: 400 },
    );
  }
}
