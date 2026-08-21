import { NextRequest, NextResponse } from "next/server";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { currentUser } from "../../../../lib/auth-session";

const ITEMS: Record<string, { name: string; price: number; currency: "coins" | "gems"; kind: "item" | "avatar" }> = {
  "shield": { name: "Shield", price: 500, currency: "gems", kind: "item" },
  "trail": { name: "Trail", price: 500, currency: "gems", kind: "item" },
  "crown": { name: "Crown", price: 500, currency: "gems", kind: "item" },
  "golden-dice": { name: "Golden Dice", price: 500, currency: "gems", kind: "item" },
  "avatar-1": { name: "Avatar 1", price: 500, currency: "gems", kind: "avatar" },
  "avatar-2": { name: "Avatar 2", price: 700, currency: "gems", kind: "avatar" },
  "avatar-3": { name: "Avatar 3", price: 1000, currency: "gems", kind: "avatar" },
  "avatar-4": { name: "Avatar 4", price: 1200, currency: "gems", kind: "avatar" },
  "avatar-5": { name: "Avatar 5", price: 1300, currency: "gems", kind: "avatar" },
  "avatar-6": { name: "Avatar 6", price: 2000, currency: "gems", kind: "avatar" },
};

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  let tx = false;
  try {
    await ensureAuthSchema();
    const user = await currentUser(req);
    if (!user || user.is_guest) return NextResponse.json({ error: "A registered account is required." }, { status: 403 });
    const body = await req.json();
    const id = String(body.id || "");
    const quantity = Math.max(0, Math.floor(Number(body.quantity) || 0));
    const coinGemPurchase = body.type === "coin_package" && quantity > 0;
    const item = ITEMS[id];
    if (!item && !coinGemPurchase) return NextResponse.json({ error: "Shop item not found." }, { status: 404 });

    await client.query("BEGIN"); tx = true;
    const r = await client.query("SELECT coins,gems,inventory FROM ludo_users WHERE id=$1 FOR UPDATE", [user.id]);
    const row = r.rows[0]; if (!row) throw new Error("Account not found.");
    const coins = Number(row.coins) || 0, gems = Number(row.gems) || 0;

    if (coinGemPurchase) {
      const costGems = Math.max(0, Math.floor(Number(body.costGems) || 0));
      if (gems < costGems) { await client.query("ROLLBACK"); tx=false; return NextResponse.json({ error: "Not enough gems." }, { status: 400 }); }
      const nextGems = gems - costGems, nextCoins = coins + quantity;
      await client.query("UPDATE ludo_users SET coins=$1,gems=$2 WHERE id=$3", [nextCoins,nextGems,user.id]);
      await client.query("INSERT INTO ludo_admin_ledger(user_id,currency,amount,balance_before,balance_after,reason,source) VALUES($1,'gems',$2,$3,$4,$5,'shop')", [user.id,-costGems,gems,nextGems,`Purchased ${quantity} coins`]);
      await client.query("INSERT INTO ludo_admin_ledger(user_id,currency,amount,balance_before,balance_after,reason,source) VALUES($1,'coins',$2,$3,$4,$5,'shop')", [user.id,quantity,coins,nextCoins,`Purchased ${quantity} coins`]);
      await client.query("COMMIT"); tx=false; return NextResponse.json({ ok:true, coins:nextCoins, gems:nextGems });
    }

    const owned: string[] = Array.isArray(row.inventory) ? row.inventory.map(String) : [];
    if (owned.includes(id)) { await client.query("ROLLBACK"); tx=false; return NextResponse.json({ error:"You already own this item." }, { status:409 }); }
    const balance = item.currency === "gems" ? gems : coins;
    if (balance < item.price) { await client.query("ROLLBACK"); tx=false; return NextResponse.json({ error:`Not enough ${item.currency}.` }, { status:400 }); }
    const next = balance - item.price;
    const nextInventory = [...owned,id];
    await client.query(`UPDATE ludo_users SET ${item.currency}=$1,inventory=$2 WHERE id=$3`, [next, JSON.stringify(nextInventory), user.id]);
    await client.query("INSERT INTO ludo_admin_ledger(user_id,currency,amount,balance_before,balance_after,reason,source) VALUES($1,$2,$3,$4,$5,$6,'shop')", [user.id,item.currency,-item.price,balance,next,`Purchased ${item.name}`]);
    await client.query("COMMIT"); tx=false;
    return NextResponse.json({ ok:true, coins:item.currency === "coins" ? next : coins, gems:item.currency === "gems" ? next : gems, item });
  } catch (e) { if(tx) await client.query("ROLLBACK").catch(()=>{}); console.error(e); return NextResponse.json({error:"Unable to complete purchase."},{status:500}); } finally { client.release(); }
}
