import { NextResponse } from "next/server";

import { availabilityUpdateSchema } from "@/lib/validators";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const payload = availabilityUpdateSchema.parse(await request.json());

    const updates = await Promise.all(
      payload.entries.map(async (entry) => {
        const { data, error } = await admin.rpc("upsert_match_availability", {
          p_match_id: payload.matchId,
          p_user_id: user.id,
          p_slot_label: entry.slotLabel,
          p_slot_starts_at: entry.slotStartsAt,
          p_slot_ends_at: entry.slotEndsAt,
          p_is_available: entry.isAvailable,
        });

        if (error) {
          throw new Error(error.message);
        }

        return data;
      }),
    );

    return NextResponse.json({ availability: updates });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update availability." },
      { status: 400 },
    );
  }
}
