import { NextRequest, NextResponse } from "next/server";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { currentUser } from "../../../../lib/auth-session";

const PACKAGES: Record<string, { gems: number; amountNaira: number }> = {
  "gems-50": { gems: 50, amountNaira: 1000 }, "gems-100": { gems: 100, amountNaira: 1500 }, "gems-200": { gems: 200, amountNaira: 2500 }, "gems-400": { gems: 400, amountNaira: 4000 }, "gems-500": { gems: 500, amountNaira: 5000 }, "gems-1000": { gems: 1000, amountNaira: 8000 }, "gems-1500": { gems: 1500, amountNaira: 10000 },
};

export async function POST(request: NextRequest) {
  try {
    await ensureAuthSchema();
    const user = await currentUser(request);
    if (!user || user.is_guest) return NextResponse.json({ error: "A registered account is required." }, { status: 403 });
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "Paystack is not configured yet. Add PAYSTACK_SECRET_KEY in Railway." }, { status: 503 });
    const body = await request.json().catch(() => ({}));
    const packageId = String(body.packageId || ""); const email = String(body.email || user.email || "").trim(); const pack = PACKAGES[packageId];
    if (!pack) return NextResponse.json({ error: "Invalid gem package." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const reference = `ludo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const amountKobo = pack.amountNaira * 100;
    const response = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ email, amount: String(amountKobo), currency: "NGN", reference, callback_url: `${origin}/api/paystack/callback`, metadata: { product: "ludo-gems", packageId, gems: pack.gems, amountNaira: pack.amountNaira } }) });
    const data = await response.json();
    if (!response.ok || !data.status || !data.data?.authorization_url) return NextResponse.json({ error: data.message || "Paystack could not initialize the transaction." }, { status: 502 });
    await pool.query("INSERT INTO ludo_shop_payments(reference,user_id,package_id,gems,amount_kobo,status) VALUES($1,$2,$3,$4,$5,'pending')", [reference, user.id, packageId, pack.gems, amountKobo]);
    return NextResponse.json({ authorization_url: data.data.authorization_url, reference: data.data.reference });
  } catch (error) { console.error(error); return NextResponse.json({ error: error instanceof Error ? error.message : "Payment initialization failed." }, { status: 500 }); }
}
