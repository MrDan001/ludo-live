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
    if (!secret) return NextResponse.json({ error: "Paystack is not configured yet." }, { status: 503 });
    const body = await request.json().catch(() => ({}));
    const type = String(body.type || "");
    const id = String(body.id || "");
    const email = String(body.email || user.email || "").trim();
    const item = await getShopItem(type, id);
    if (!item || item.currency !== "naira") return NextResponse.json({ error: "This item is not configured for Naira payment." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const reference = `ludo-item-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
    const amountKobo = Math.trunc(item.price) * 100;
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, amount: String(amountKobo), currency: "NGN", reference, callback_url: `${origin}/api/paystack/callback`, metadata: { product: "ludo-shop-item", itemType: type, itemId: id, amountNaira: item.price } })
    });
    const data = await response.json();
    if (!response.ok || !data.status || !data.data?.authorization_url) return NextResponse.json({ error: data.message || "Paystack could not initialize the transaction." }, { status: 502 });
    await pool.query("INSERT INTO ludo_shop_payments(reference,user_id,package_id,gems,amount_kobo,status) VALUES($1,$2,$3,0,$4,'pending')", [reference, user.id, `item:${type}:${id}`, amountKobo]);
    return NextResponse.json({ authorization_url: data.data.authorization_url, reference: data.data.reference });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Payment initialization failed." }, { status: 500 });
  }
}
