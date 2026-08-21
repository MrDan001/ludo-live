import { NextRequest, NextResponse } from "next/server";
import { pool, ensureAuthSchema } from "../auth/_db";
import { currentUser } from "../../../lib/auth-session";
import { BOARDS, DICE, CATALOG } from "../../../lib/customization-catalog";

const clean = (list: unknown) => Array.isArray(list) ? list.map(String) : [];

export async function GET(q: NextRequest) {
  try {
    await ensureAuthSchema();
    const u = await currentUser(q);
    if (!u) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    return NextResponse.json({
      coins: u.coins,
      gems: u.gems,
      ownedBoards: clean(u.owned_boards || ["classic"]),
      ownedDice: clean(u.owned_dice || ["classic"]),
      equippedBoard: u.equipped_board || "classic",
      equippedDice: u.equipped_dice || "classic",
      boards: BOARDS,
      dice: DICE,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Customization service unavailable." }, { status: 500 });
  }
}

export async function POST(q: NextRequest) {
  const client = await pool.connect();
  let inTx = false;
  try {
    await ensureAuthSchema();
    const u = await currentUser(q);
    if (!u || u.is_guest) return NextResponse.json({ error: "A registered account is required." }, { status: 403 });

    const b = await q.json();
    const action = String(b.action || "");
    const id = String(b.id || "");
    const type = String(b.type || "");
    const item = CATALOG.find((x) => x.id === id && x.type === type);
    if (!item) return NextResponse.json({ error: "Item not found." }, { status: 404 });

    await client.query("BEGIN");
    inTx = true;
    const row = await client.query<any>(
      "SELECT coins,gems,owned_boards,owned_dice,equipped_board,equipped_dice FROM ludo_users WHERE id=$1 FOR UPDATE",
      [u.id]
    );
    const cur = row.rows[0];
    const boards = clean(cur.owned_boards || ["classic"]);
    const dice = clean(cur.owned_dice || ["classic"]);

    if (action === "equip") {
      if (!(type === "board" ? boards : dice).includes(id)) {
        await client.query("ROLLBACK");
        inTx = false;
        return NextResponse.json({ error: "Purchase this item first." }, { status: 403 });
      }
      if (type === "board") {
        await client.query("UPDATE ludo_users SET equipped_board=$1 WHERE id=$2", [id, u.id]);
      } else {
        await client.query("UPDATE ludo_users SET equipped_dice=$1 WHERE id=$2", [id, u.id]);
      }
      await client.query("COMMIT");
      inTx = false;
      return NextResponse.json({
        ok: true,
        equippedBoard: type === "board" ? id : cur.equipped_board,
        equippedDice: type === "dice" ? id : cur.equipped_dice,
      });
    }

    if (action !== "purchase") {
      await client.query("ROLLBACK");
      inTx = false;
      return NextResponse.json({ error: "Unknown customization action." }, { status: 400 });
    }

    if ((type === "board" ? boards : dice).includes(id)) {
      await client.query("ROLLBACK");
      inTx = false;
      return NextResponse.json({ error: "You already own this item." }, { status: 409 });
    }

    const balance = Number(cur[item.currency as "coins" | "gems"]);
    if (balance < item.price) {
      await client.query("ROLLBACK");
      inTx = false;
      return NextResponse.json({ error: `Not enough ${item.currency}.` }, { status: 400 });
    }

    const next = balance - item.price;
    const column = type === "board" ? "owned_boards" : "owned_dice";
    await client.query(
      `UPDATE ludo_users SET ${item.currency}=$1,${column}=CASE WHEN ${column} ? $2 THEN ${column} ELSE ${column} || jsonb_build_array($2) END WHERE id=$3`,
      [next, id, u.id]
    );
    await client.query(
      "INSERT INTO ludo_admin_ledger(user_id,currency,amount,balance_before,balance_after,reason,source) VALUES($1,$2,$3,$4,$5,$6,'shop')",
      [u.id, item.currency, -item.price, balance, next, `Purchased ${item.name}`]
    );
    await client.query("COMMIT");
    inTx = false;

    return NextResponse.json({
      ok: true,
      coins: item.currency === "coins" ? next : cur.coins,
      gems: item.currency === "gems" ? next : cur.gems,
      item,
    });
  } catch (e) {
    if (inTx) await client.query("ROLLBACK").catch(() => {});
    console.error(e);
    return NextResponse.json({ error: "Unable to update customization." }, { status: 500 });
  } finally {
    client.release();
  }
}
