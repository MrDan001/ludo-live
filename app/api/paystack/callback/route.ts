import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") || "";
  const shopUrl = new URL("/shop", request.url);
  if (!reference) {
    shopUrl.searchParams.set("payment", "failed");
    return NextResponse.redirect(shopUrl);
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    shopUrl.searchParams.set("payment", "failed");
    shopUrl.searchParams.set("reason", "payment_not_configured");
    return NextResponse.redirect(shopUrl);
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const result = await response.json();
    const payment = result?.data;
    const gems = Number(payment?.metadata?.gems || 0);
    const expectedAmount = Number(payment?.metadata?.amountNaira || 0) * 100;
    const successful = response.ok && result?.status === true && payment?.status === "success" && payment?.currency === "NGN" && Number(payment?.amount) === expectedAmount && gems > 0;

    if (successful) {
      shopUrl.searchParams.set("payment", "success");
      shopUrl.searchParams.set("gems", String(gems));
      shopUrl.searchParams.set("reference", reference);
    } else {
      shopUrl.searchParams.set("payment", "failed");
    }
  } catch {
    shopUrl.searchParams.set("payment", "failed");
  }

  return NextResponse.redirect(shopUrl);
}
