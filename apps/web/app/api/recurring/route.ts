import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// GET /api/recurring?teamId=xxx
export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("teamId");
  const admin = createAdminClient();
  const { user } = await requireAuthenticatedUser(req);

  const q = admin.from("recurring_matches").select("*").eq("captain_id", user.id).eq("is_active", true);
  if (teamId) q.eq("team_id", teamId);
  const { data } = await q.order("created_at", { ascending: false });

  return NextResponse.json({ templates: data ?? [] });
}

// POST /api/recurring — create or generate next match from template
export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const { user } = await requireAuthenticatedUser(req);
    const body = await req.json() as Record<string, unknown>;

    if (body.action === "generate") {
      // Generate the next N matches from a template
      const templateId = body.templateId as string;
      const count = Math.min(Number(body.count ?? 4), 12);

      const { data: tmpl } = await admin.from("recurring_matches").select("*").eq("id", templateId).eq("captain_id", user.id).single();
      if (!tmpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });

      const createdIds: string[] = [];
      let baseDate = new Date();

      for (let i = 0; i < count; i++) {
        // Find next occurrence of the day_of_week
        const target = new Date(baseDate);
        const dow = tmpl.day_of_week as number ?? 0;
        const daysUntil = (dow - target.getDay() + 7) % 7 || (i === 0 ? 7 : 0);
        target.setDate(target.getDate() + daysUntil);

        const [h, m] = ((tmpl.time_of_day as string) ?? "07:00").split(":").map(Number);
        target.setHours(h, m, 0, 0);

        const paymentDue = new Date(target.getTime() - 3 * 60 * 60 * 1000);
        const lockAt     = new Date(target.getTime() - 1 * 60 * 60 * 1000);

        const { data: match } = await admin.from("matches").insert({
          team_id:          tmpl.team_id,
          captain_id:       user.id,
          title:            `${tmpl.title as string} — ${target.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}`,
          sport:            tmpl.sport,
          venue_name:       tmpl.venue_name,
          venue_address:    tmpl.venue_address,
          squad_size:       tmpl.squad_size,
          price_per_player: tmpl.price_per_player,
          starts_at:        target.toISOString(),
          payment_due_at:   paymentDue.toISOString(),
          lock_at:          lockAt.toISOString(),
          status:           "RSVP_OPEN",
          visibility:       "PUBLIC",
        }).select("id").single();

        if (match) createdIds.push(match.id as string);

        // Advance baseDate for next iteration
        if ((tmpl.frequency as string) === "BIWEEKLY") baseDate.setDate(baseDate.getDate() + 14);
        else if ((tmpl.frequency as string) === "MONTHLY") baseDate.setMonth(baseDate.getMonth() + 1);
        else baseDate.setDate(baseDate.getDate() + 7);
      }

      return NextResponse.json({ created: createdIds.length, matchIds: createdIds });
    }

    // Create template
    const { data, error } = await admin.from("recurring_matches").insert({
      team_id:          body.teamId,
      captain_id:       user.id,
      title:            body.title,
      sport:            body.sport ?? null,
      venue_name:       body.venueName ?? null,
      venue_address:    body.venueAddress ?? null,
      squad_size:       body.squadSize ?? 11,
      price_per_player: body.pricePerPlayer ?? 0,
      frequency:        body.frequency ?? "WEEKLY",
      day_of_week:      body.dayOfWeek ?? 0,
      time_of_day:      body.timeOfDay ?? "07:00",
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ template: data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

// DELETE /api/recurring?id=xxx — deactivate template
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const admin = createAdminClient();
  const { user } = await requireAuthenticatedUser(req);
  await admin.from("recurring_matches").update({ is_active: false }).eq("id", id).eq("captain_id", user.id);
  return NextResponse.json({ ok: true });
}
