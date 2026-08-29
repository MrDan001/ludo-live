import { NextRequest, NextResponse } from "next/server";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { fulfillPaystackPayment } from "../fulfill";

export async function GET(request: NextRequest) {
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
    await ensureAuthSchema();
    const paymentRow = await pool.query<any>(
      "SELECT reference,amount_kobo,status FROM ludo_shop_payments WHERE reference=$1 LIMIT 1",
      [reference],
    );
    const pending = paymentRow.rows[0];
    if (!pending) {
      shopUrl.searchParams.set("payment", "failed");
      shopUrl.searchParams.set("reason", "unknown_reference");
      return NextResponse.redirect(shopUrl);
    }

    if (pending.status !== "credited") {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
      });
      const result = await response.json();
      const payment = result?.data;
      const successful = response.ok && result?.status === true && payment?.status === "success" && payment?.currency === "NGN" && Number(payment?.amount) === Number(pending.amount_kobo);
      if (!successful) {
        shopUrl.searchParams.set("payment", "failed");
        return NextResponse.redirect(shopUrl);
      }

      const client = await pool.connect();
      try {
        await fulfillPaystackPayment(client, reference);
      } finally {
        client.release();
      }
    }

    shopUrl.searchParams.set("payment", "success");
    shopUrl.searchParams.set("reference", reference);
  } catch (error) {
    console.error("Paystack callback fulfillment failed:", error);
    shopUrl.searchParams.set("payment", "failed");
  }

  return NextResponse.redirect(shopUrl);
}
