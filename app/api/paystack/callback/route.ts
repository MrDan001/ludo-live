import { NextRequest, NextResponse } from "next/server";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { getShopItem } from "../../shop/catalog";

const XP_PER_DIAMOND_PURCHASE = 15;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") || "";
  const shopUrl = new URL("/shop", request.url);
  if (!reference) { shopUrl.searchParams.set("payment", "failed"); return NextResponse.redirect(shopUrl); }
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) { shopUrl.searchParams.set("payment", "failed"); shopUrl.searchParams.set("reason", "payment_not_configured"); return NextResponse.redirect(shopUrl); }

  try {
    await ensureAuthSchema();
    const paymentRow = await pool.query<any>("SELECT reference,user_id,package_id,gems,amount_kobo,status FROM ludo_shop_payments WHERE reference=$1 LIMIT 1", [reference]);
    const pending = paymentRow.rows[0];
    if (!pending) { shopUrl.searchParams.set("payment", "failed"); shopUrl.searchParams.set("reason", "unknown_reference"); return NextResponse.redirect(shopUrl); }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" });
    const result = await response.json();
    const payment = result?.data;
    const successful = response.ok && result?.status === true && payment?.status === "success" && payment?.currency === "NGN" && Number(payment?.amount) === Number(pending.amount_kobo);
    if (!successful) { shopUrl.searchParams.set("payment", "failed"); return NextResponse.redirect(shopUrl); }

    const client = await pool.connect();
    let tx = false;
    try {
      await client.query("BEGIN"); tx = true;
      const locked = await client.query<any>("SELECT status,user_id,package_id,gems FROM ludo_shop_payments WHERE reference=$1 FOR UPDATE", [reference]);
      const row = locked.rows[0];
      if (!row) throw new Error("Payment record disappeared.");
      if (row.status !== "credited") {
        if (String(row.package_id).startsWith("item:")) {
          const [, type, id] = String(row.package_id).split(":");
          const item = await getShopItem(type, id);
          if (!item || item.currency !== "naira") throw new Error("Shop item is no longer available for Naira payment.");
          const user = await client.query<any>("SELECT owned_boards,owned_dice,owned_avatars,owned_items FROM ludo_users WHERE id=$1 FOR UPDATE", [row.user_id]);
          if (!user.rows[0]) throw new Error("Account not found.");
          const field = type === "board" ? "owned_boards" : type === "dice" ? "owned_dice" : type === "avatar" ? "owned_avatars" : "owned_items";
          const owned = Array.isArray(user.rows[0][field]) ? user.rows[0][field].map(String) : JSON.parse(user.rows[0][field] || "[]");
          if (!owned.includes(id)) {
            const next = [...owned, id];
            await client.query(`UPDATE ludo_users SET ${field}=$1::jsonb WHERE id=$2`, [JSON.stringify(next), row.user_id]);
          }
          shopUrl.searchParams.set("item", id);
        } else {
          const user = await client.query<any>("SELECT gems,xp,level FROM ludo_users WHERE id=$1 FOR UPDATE", [row.user_id]);
          if (!user.rows[0]) throw new Error("Account not found.");
          const before = Number(user.rows[0].gems) || 0;
          const after = before + Number(row.gems);
          let xp = Math.max(0, Number(user.rows[0].xp) || 0) + XP_PER_DIAMOND_PURCHASE;
          let level = Math.max(0, Number(user.rows[0].level) || 0);
          const required = (n:number) => 10 + Math.max(0, n) * 5;
          while (xp >= required(level)) { xp -= required(level); level += 1; }
          await client.query("UPDATE ludo_users SET gems=$1,xp=$2,level=$3 WHERE id=$4", [after, xp, level, row.user_id]);
          await client.query("INSERT INTO ludo_admin_ledger(user_id,currency,amount,balance_before,balance_after,reason,source) VALUES($1,'gems',$2,$3,$4,$5,'paystack')", [row.user_id, row.gems, before, after, `Purchased ${row.gems} gems`]);
          shopUrl.searchParams.set("gems", String(row.gems));
        }
        await client.query("UPDATE ludo_shop_payments SET status='credited',credited_at=NOW() WHERE reference=$1", [reference]);
      }
      await client.query("COMMIT"); tx = false;
    } catch (e) {
      if (tx) await client.query("ROLLBACK").catch(()=>{});
      throw e;
    } finally { client.release(); }
    shopUrl.searchParams.set("payment", "success");
    shopUrl.searchParams.set("reference", reference);
  } catch (e) {
    console.error(e);
    shopUrl.searchParams.set("payment", "failed");
  }
  return NextResponse.redirect(shopUrl);
}
