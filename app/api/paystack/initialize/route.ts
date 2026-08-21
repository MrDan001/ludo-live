import { NextResponse } from "next/server";

const PACKAGES: Record<string, { gems: number; amountNaira: number }> = {
  "gems-50": { gems: 50, amountNaira: 1000 },
  "gems-100": { gems: 100, amountNaira: 1500 },
  "gems-200": { gems: 200, amountNaira: 2500 },
  "gems-400": { gems: 400, amountNaira: 4000 },
  "gems-500": { gems: 500, amountNaira: 5000 },
  "gems-1000": { gems: 1000, amountNaira: 8000 },
  "gems-1500": { gems: 1500, amountNaira: 10000 },
};

export async function POST(request: Request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "Paystack is not configured yet. Add PAYSTACK_SECRET_KEY in Railway." }, { status: 503 });

    const body = await request.json().catch(() => ({}));
    const packageId = String(body.packageId || "");
    const email = String(body.email || "").trim();
    const pack = PACKAGES[packageId];
    if (!pack) return NextResponse.json({ error: "Invalid gem package." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const reference = `ludo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount: String(pack.amountNaira * 100),
        currency: "NGN",
        reference,
        callback_url: `${origin}/api/paystack/callback`,
        metadata: { product: "ludo-gems", packageId, gems: pack.gems, amountNaira: pack.amountNaira },
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.status || !data.data?.authorization_url) return NextResponse.json({ error: data.message || "Paystack could not initialize the transaction." }, { status: 502 });
    return NextResponse.json({ authorization_url: data.data.authorization_url, reference: data.data.reference });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payment initialization failed." }, { status: 500 });
  }
}
