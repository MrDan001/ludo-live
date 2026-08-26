import { NextRequest, NextResponse } from "next/server";
import { pool } from "../../auth/_db";
import { currentUser } from "../../../../lib/auth-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return NextResponse.json({ subscribed: false }, { status: 401 });
    const result = await pool.query("SELECT 1 FROM ludo_push_subscriptions WHERE user_id=$1 LIMIT 1", [user.id]);
    return NextResponse.json({ subscribed: result.rowCount === 1 });
  } catch (error) {
    console.error("Push subscription status", error);
    return NextResponse.json({ error: "Notification service is unavailable." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
    const body = await request.json();
    const subscription = body?.subscription;
    const endpoint = String(subscription?.endpoint || "").trim();
    const p256dh = String(subscription?.keys?.p256dh || "").trim();
    const auth = String(subscription?.keys?.auth || "").trim();
    if (!endpoint || !p256dh || !auth) return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
    await pool.query(`INSERT INTO ludo_push_subscriptions(user_id,endpoint,p256dh,auth,user_agent) VALUES($1,$2,$3,$4,$5) ON CONFLICT(endpoint) DO UPDATE SET user_id=EXCLUDED.user_id,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,user_agent=EXCLUDED.user_agent,updated_at=NOW()`, [user.id, endpoint, p256dh, auth, request.headers.get("user-agent") || null]);
    return NextResponse.json({ ok: true, required: true });
  } catch (error) {
    console.error("Push subscription save", error);
    return NextResponse.json({ error: "Could not register notifications." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const endpoint = String(body?.endpoint || "").trim();
    if (endpoint) await pool.query("DELETE FROM ludo_push_subscriptions WHERE user_id=$1 AND endpoint=$2", [user.id, endpoint]);
    else await pool.query("DELETE FROM ludo_push_subscriptions WHERE user_id=$1", [user.id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Push subscription delete", error);
    return NextResponse.json({ error: "Could not remove notification registration." }, { status: 500 });
  }
}
