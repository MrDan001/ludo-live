import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { fulfillPaystackPayment } from "../fulfill";

export async function POST(request: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Paystack is not configured." }, { status: 503 });

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") || "";
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  const valid = signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });

  let event: any;
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (event?.event !== "charge.success") return NextResponse.json({ received: true });

  const reference = String(event?.data?.reference || "");
  if (!reference) return NextResponse.json({ error: "Missing transaction reference." }, { status: 400 });

  try {
    await ensureAuthSchema();
    const pendingResult = await pool.query<any>(
      "SELECT reference,amount_kobo,status FROM ludo_shop_payments WHERE reference=$1 LIMIT 1",
      [reference],
    );
    const pending = pendingResult.rows[0];
    if (!pending) return NextResponse.json({ error: "Unknown payment reference." }, { status: 404 });
    if (pending.status === "credited") return NextResponse.json({ received: true, alreadyCredited: true });

    const payment = event.data;
    if (payment.status !== "success" || payment.currency !== "NGN" || Number(payment.amount) !== Number(pending.amount_kobo)) {
      return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
    }

    // Defense in depth: confirm the reference against Paystack's Verify API before delivering value.
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const verifyResult = await verifyResponse.json();
    const verified = verifyResponse.ok && verifyResult?.status === true && verifyResult?.data?.status === "success" && verifyResult?.data?.currency === "NGN" && Number(verifyResult?.data?.amount) === Number(pending.amount_kobo);
    if (!verified) return NextResponse.json({ error: "Paystack verification failed." }, { status: 400 });

    const client = await pool.connect();
    try {
      const result = await fulfillPaystackPayment(client, reference);
      return NextResponse.json({ received: true, ...result });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Paystack webhook fulfillment failed:", error);
    // Non-2xx tells Paystack to retry the event. Live webhooks are retried for up to 72 hours.
    return NextResponse.json({ error: "Payment received but fulfillment failed; retrying." }, { status: 500 });
  }
}
