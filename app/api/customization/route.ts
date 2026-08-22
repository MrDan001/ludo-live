import { NextRequest, NextResponse } from "next/server";
import { pool, ensureAuthSchema } from "../auth/_db";
import { currentUser } from "../../../lib/auth-session";
import { BOARDS, DICE, AVATARS, ITEMS, CATALOG } from "../../../lib/customization-catalog";

const clean = (list: unknown) => Array.isArray(list) ? list.map(String) : [];

export async function GET(q: NextRequest) {
  try {
    await ensureAuthSchema();
    const u = await currentUser(q);
    if (!u) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    return NextResponse.json({ coins: Number(u.coins) || 0, gems: Number(u.gems) || 0, ownedBoards: clean(u.owned_boards || ["classic"]), ownedDice: clean(u.owned_dice || ["classic"]), equippedBoard: u.equipped_board || "classic", equippedDice: u.equipped_dice || "classic", ownedAvatars: clean(u.owned_avatars), equippedAvatar: u.equipped_avatar || "default", ownedItems: clean(u.owned_items), equippedItems: clean(u.equipped_items), boards: BOARDS, dice: DICE, avatars: AVATARS, items: ITEMS });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Customization service unavailable." }, { status: 500 }); }
}

export async function POST(q: NextRequest) {
  const client = await pool.connect(); let inTx = false;
  try {
    await ensureAuthSchema(); const u = await currentUser(q);
    if (!u || u.is_guest) return NextResponse.json({ error: "A registered account is required." }, { status: 403 });
    const b = await q.json(); const action = String(b.action || ""); const id = String(b.id || ""); const type = String(b.type || "");
    const item = CATALOG.find((x) => x.id === id && x.type === type);
    if (!item) return NextResponse.json({ error: "Item not found." }, { status: 404 });

    await client.query("BEGIN"); inTx = true;
    const row = await client.query<any>("SELECT coins,gems,owned_boards,owned_dice,equipped_board,equipped_dice,owned_avatars,equipped_avatar,owned_items,equipped_items FROM ludo_users WHERE id=$1 FOR UPDATE", [u.id]);
    const cur = row.rows[0]; if (!cur) throw new Error("Account not found.");
    const boards = clean(cur.owned_boards || ["classic"]), dice = clean(cur.owned_dice || ["classic"]), avatars = clean(cur.owned_avatars), items = clean(cur.owned_items), equippedItems = clean(cur.equipped_items);

    if (action === "equip") {
      const owned = type === "board" ? boards : type === "dice" ? dice : type === "avatar" ? avatars : items;
      if (!owned.includes(id)) return fail(client, "Purchase this item first.", 403);
      if (type === "board") await client.query("UPDATE ludo_users SET equipped_board=$1 WHERE id=$2", [id, u.id]);
      else if (type === "dice") await client.query("UPDATE ludo_users SET equipped_dice=$1 WHERE id=$2", [id, u.id]);
      else if (type === "avatar") await client.query("UPDATE ludo_users SET equipped_avatar=$1 WHERE id=$2", [id, u.id]);
      else { const next = equippedItems.includes(id) ? equippedItems : [...equippedItems, id]; await client.query("UPDATE ludo_users SET equipped_items=$1 WHERE id=$2", [JSON.stringify(next), u.id]); }
      await client.query("COMMIT"); inTx = false;
      return NextResponse.json({ ok: true, equippedBoard: type === "board" ? id : cur.equipped_board, equippedDice: type === "dice" ? id : cur.equipped_dice, equippedAvatar: type === "avatar" ? id : cur.equipped_avatar, equippedItems: type === "item" ? [...equippedItems.filter(x => x !== id), id] : equippedItems });
    }

    if (action !== "purchase") return fail(client, "Unknown customization action.", 400);
    const owned = type === "board" ? boards : type === "dice" ? dice : type === "avatar" ? avatars : items;
    if (owned.includes(id)) return fail(client, "You already own this item.", 409);
    const currency = item.currency as "coins" | "gems"; const balance = Number(cur[currency]) || 0;
    if (balance < item.price) return fail(client, `Not enough ${currency}.`, 400); const next = balance - item.price;

    if (type === "board") await client.query("UPDATE ludo_users SET coins=CASE WHEN $1='coins' THEN $2 ELSE coins END,gems=CASE WHEN $1='gems' THEN $2 ELSE gems END,owned_boards=owned_boards || jsonb_build_array($3),equipped_board=$3 WHERE id=$4", [currency, next, id, u.id]);
    else if (type === "dice") await client.query("UPDATE ludo_users SET coins=CASE WHEN $1='coins' THEN $2 ELSE coins END,gems=CASE WHEN $1='gems' THEN $2 ELSE gems END,owned_dice=owned_dice || jsonb_build_array($3),equipped_dice=$3 WHERE id=$4", [currency, next, id, u.id]);
    else if (type === "avatar") await client.query("UPDATE ludo_users SET coins=CASE WHEN $1='coins' THEN $2 ELSE coins END,gems=CASE WHEN $1='gems' THEN $2 ELSE gems END,owned_avatars=owned_avatars || jsonb_build_array($3),equipped_avatar=$3 WHERE id=$4", [currency, next, id, u.id]);
    else await client.query("UPDATE ludo_users SET coins=CASE WHEN $1='coins' THEN $2 ELSE coins END,gems=CASE WHEN $1='gems' THEN $2 ELSE gems END,owned_items=owned_items || jsonb_build_array($3),equipped_items=equipped_items || jsonb_build_array($3) WHERE id=$4", [currency, next, id, u.id]);

    await client.query("INSERT INTO ludo_admin_ledger(user_id,currency,amount,balance_before,balance_after,reason,source) VALUES($1,$2,$3,$4,$5,$6,'shop')", [u.id, currency, -item.price, balance, next, `Purchased ${item.name}`]);
    await client.query("COMMIT"); inTx = false;
    return NextResponse.json({ ok: true, coins: currency === "coins" ? next : Number(cur.coins), gems: currency === "gems" ? next : Number(cur.gems), item, purchased: true, equippedAvatar: type === "avatar" ? id : cur.equipped_avatar });
  } catch (e: any) {
    if (inTx) await client.query("ROLLBACK").catch(() => {});
    if (e?.handled) return NextResponse.json({ error: e.message }, { status: Number(e.status) || 400 });
    console.error(e); return NextResponse.json({ error: "Unable to update customization." }, { status: 500 });
  } finally { client.release(); }
}

async function fail(client: any, message: string, status: number): Promise<never> { await client.query("ROLLBACK").catch(() => {}); throw Object.assign(new Error(message), { status, handled: true }); }
