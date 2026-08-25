import { NextRequest, NextResponse } from "next/server";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { currentUser } from "../../../../lib/auth-session";
import { getShopItem } from "../../shop/catalog";

export async function POST(request: NextRequest) {
  try {
    await ensureAuthSchema();
    const user = await currentUser(request);
    if (!user || user.is_guest) return NextResponse.json({ error: "A registered account is required." }, { status: 403 });
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "Paystack is not configured yet. Add PAYSTACK_SECRET_KEY in Railway." }, { status: 503 });
    const body = await request.json().catch(() => ({}));
    const packageId = String(body.packageId || "");
    const email = String(body.email || user.email || "").trim();
    const type = String(body.type || "gem_package");
    const pack = await getShopItem(type, packageId);
    if (!pack || (type !== "coin_package" && type !== "gem_package") || pack.currency !== "naira") return NextResponse.json({ error: "Invalid Naira package or package pricing." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    const reward = Math.max(0, Number((pack as any).reward) || 0);
    if (!reward) return NextResponse.json({ error: "Package reward is not configured." }, { status: 400 });
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const reference = `ludo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const amountNaira = Math.max(0, Number(pack.price) || 0);
    const amountKobo = amountNaira * 100;
    const response = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ email, amount: String(amountKobo), currency: "NGN", reference, callback_url: `${origin}/api/paystack/callback`, metadata: { product: `ludo-${type}`, packageId, reward, rewardCurrency: (pack as any).rewardCurrency, amountNaira } }) });
    const data = await response.json();
    if (!response.ok || !data.status || !data.data?.authorization_url) return NextResponse.json({ error: data.message || "Paystack could not initialize the transaction." }, { status: 502 });
    await pool.query("INSERT INTO ludo_shop_payments(reference,user_id,package_id,gems,amount_kobo,status) VALUES($1,$2,$3,$4,$5,'pending')", [reference, user.id, `package:${type}:${packageId}`, reward, amountKobo]);
    return NextResponse.json({ authorization_url: data.data.authorization_url, reference: data.data.reference });
  } catch (error) { console.error(error); return NextResponse.json({ error: error instanceof Error ? error.message : "Payment initialization failed." }, { status: 500 }); }
}
