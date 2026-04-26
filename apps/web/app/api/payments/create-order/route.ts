import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/services/supabase/server";

// POST /api/payments/create-order
// Returns Razorpay order OR manual UPI details depending on env config
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { matchId: string };
    if (!body.matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: match } = await supabase
      .from("matches")
      .select("id, title, price_per_player, captain_id")
      .eq("id", body.matchId)
      .single();
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const razorpayReady = keyId && keySecret && keyId !== "placeholder" && keySecret !== "placeholder";

    // Fallback to manual UPI
    if (!razorpayReady) {
      const { data: captain } = await supabase
        .from("users")
        .select("display_name, upi_id, upi_name")
        .eq("id", match.captain_id as string)
        .single();
      return NextResponse.json({
        mode: "manual_upi",
        amount: match.price_per_player,
        captainName: (captain as Record<string, string>)?.upi_name || (captain as Record<string, string>)?.display_name || "Captain",
        upiId: (captain as Record<string, string>)?.upi_id || null,
        matchTitle: match.title,
      });
    }

    // Create Razorpay order
    const amount = Math.round((match.price_per_player as number) * 100);
    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
      },
      body: JSON.stringify({
        amount, currency: "INR",
        receipt: `k_${body.matchId.slice(0,16)}_${user.id.slice(0,8)}`,
        notes: { matchId: body.matchId, userId: user.id },
      }),
    });
    if (!orderRes.ok) {
      const err = await orderRes.json() as { error?: { description?: string } };
      return NextResponse.json({ error: (err?.error?.description as string) ?? "Razorpay order failed" }, { status: 500 });
    }
    const order = await orderRes.json() as { id: string; amount: number };

    const { data: payment } = await supabase.from("payments").insert({
      match_id: body.matchId, user_id: user.id,
      amount: match.price_per_player, currency: "INR",
      status: "CREATED", gateway_order_id: order.id,
    }).select("id").single();

    return NextResponse.json({
      mode: "razorpay",
      paymentId: payment?.id,
      orderId: order.id,
      amount: order.amount,
      currency: "INR",
      keyId,
      matchId: body.matchId,
      matchTitle: match.title,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
