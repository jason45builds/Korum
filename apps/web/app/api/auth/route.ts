import { NextResponse } from "next/server";

import { authProfileSchema } from "@/lib/validators";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

const upsertProfile = async (
  admin: ReturnType<typeof createAdminClient>,
  user: { id: string; phone?: string | null; email?: string | null; user_metadata?: Record<string, unknown> },
  overrides?: Record<string, unknown>,
) => {
  const meta = user.user_metadata ?? {};
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.display_name === "string" && meta.display_name) ||
    user.email?.split("@")[0] ||
    user.phone ||
    "Korum Player";

  const phone = user.phone || `email-${user.id.slice(0, 8)}`;

  const payload = {
    id: user.id,
    phone,
    full_name: fullName,
    display_name: fullName,
    avatar_url: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
    default_sport: typeof meta.default_sport === "string" ? meta.default_sport : null,
    city: typeof meta.city === "string" ? meta.city : null,
    ...overrides,
  };

  const { data, error } = await admin
    .from("users")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export async function GET(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const profile = await upsertProfile(admin, user);
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

    const profile = await upsertProfile(admin, user, {
      full_name: payload.fullName,
      display_name: payload.displayName ?? payload.fullName,
      default_sport: payload.defaultSport ?? null,
      city: payload.city ?? null,
      role: payload.role ?? "player",
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save profile." },
      { status: 400 },
    );
  }
}
