import { NextResponse } from "next/server";
import { createAdminClient, requireAuthenticatedUser } from "@/services/supabase/server";

export async function GET(request: Request) {
  try {
    const admin   = createAdminClient();
    const { user } = await requireAuthenticatedUser(request);
    const matchId = new URL(request.url).searchParams.get("matchId");
    if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

    // Get the latest poll link for this match
    const { data: link, error: le } = await admin
      .from("poll_links")
      .select("*")
      .eq("match_id", matchId)
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (le) throw new Error(le.message);
    if (!link) return NextResponse.json({ token: null, pollData: null });

    // Get responses
    const { data: responses } = await admin
      .from("anon_responses")
      .select("id, player_name, response, payment_claimed, payment_note, created_at")
      .eq("poll_link_id", link.id)
      .order("created_at");

    const yes   = (responses ?? []).filter((r) => r.response === "YES").length;
    const no    = (responses ?? []).filter((r) => r.response === "NO").length;
    const maybe = (responses ?? []).filter((r) => r.response === "MAYBE").length;

    return NextResponse.json({
      token: link.token,
      pollData: {
        link: { id: link.id, token: link.token },
        responses: responses ?? [],
        summary: { yes, no, maybe, total: (responses ?? []).length },
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}
