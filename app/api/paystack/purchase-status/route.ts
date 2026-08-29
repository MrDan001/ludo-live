import { NextRequest, NextResponse } from "next/server";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { currentUser } from "../../../../lib/auth-session";
import { getShopItem } from "../../shop/catalog";

export async function GET(request: NextRequest) {
  try {
    await ensureAuthSchema();
    const user = await currentUser(request);
    if (!user || user.is_guest) return NextResponse.json({ error: "Sign in to view this purchase." }, { status: 403 });

    const reference = new URL(request.url).searchParams.get("reference")?.trim() || "";
    if (!reference) return NextResponse.json({ error: "Missing payment reference." }, { status: 400 });

    const paymentResult = await pool.query<any>(
      `SELECT reference,package_id,gems,amount_kobo,status,credited_at
       FROM ludo_shop_payments WHERE reference=$1 AND user_id=$2 LIMIT 1`,
      [reference, user.id],
    );
    const payment = paymentResult.rows[0];
    if (!payment) return NextResponse.json({ error: "Purchase not found." }, { status: 404 });

    let purchaseType = "item";
    let reward = Math.max(0, Number(payment.gems) || 0);
    let rewardCurrency = "item";
    let itemName = "Shop item";
    const packageId = String(payment.package_id || "");

    if (packageId.startsWith("package:")) {
      const [, type, id] = packageId.split(":");
      purchaseType = type === "gem_package" ? "gem_package" : "coin_package";
      rewardCurrency = type === "gem_package" ? "gems" : "coins";
      const pack = await getShopItem(type, id);
      itemName = pack?.name || `${reward.toLocaleString()} ${rewardCurrency === "gems" ? "Gems" : "Coins"}`;
    } else if (packageId.startsWith("item:")) {
      const [, type, id] = packageId.split(":");
      purchaseType = type || "item";
      const item = await getShopItem(type, id);
      itemName = item?.name || `${type || "Item"} ${id || ""}`.trim();
      reward = 1;
    }

    const walletResult = await pool.query<any>("SELECT coins,gems FROM ludo_users WHERE id=$1 LIMIT 1", [user.id]);
    const wallet = walletResult.rows[0] || { coins: 0, gems: 0 };

    return NextResponse.json({
      success: payment.status === "credited",
      status: payment.status,
      reference: payment.reference,
      amountNaira: Number(payment.amount_kobo || 0) / 100,
      itemName,
      purchaseType,
      reward,
      rewardCurrency,
      creditedAt: payment.credited_at,
      wallet: { coins: Number(wallet.coins) || 0, gems: Number(wallet.gems) || 0 },
    });
  } catch (error) {
    console.error("Paystack purchase status failed:", error);
    return NextResponse.json({ error: "Unable to load purchase confirmation." }, { status: 500 });
  }
}
