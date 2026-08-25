import { NextRequest, NextResponse } from "next/server";
import { ensureAuthSchema, pool } from "../auth/_db";
import { currentUser } from "../../../lib/auth-session";

const XP_PER_GAME_WIN = 7;
const XP_PER_DIAMOND_PURCHASE = 15;

function requiredForLevel(level: number) {
  return 10 + Math.max(0, level) * 5;
}

export async function POST(request: NextRequest) {
  try {
    await ensureAuthSchema();
    const user = await currentUser(request);
    if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const source = String(body?.source || "");
    const requested = Number(body?.amount);
    const amount = source === "game_win" ? XP_PER_GAME_WIN : source === "diamond_purchase" ? XP_PER_DIAMOND_PURCHASE : requested;
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000) {
      return NextResponse.json({ error: "Invalid XP award." }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await client.query<any>("SELECT xp,level FROM ludo_users WHERE id=$1 FOR UPDATE", [user.id]);
      const row = locked.rows[0];
      if (!row) throw new Error("Account not found.");

      let xp = Math.max(0, Number(row.xp) || 0) + Math.floor(amount);
      let level = Math.max(0, Number(row.level) || 0);
      let levelsGained = 0;
      while (xp >= requiredForLevel(level)) {
        xp -= requiredForLevel(level);
        level += 1;
        levelsGained += 1;
      }

      const updated = await client.query<any>("UPDATE ludo_users SET xp=$1,level=$2 WHERE id=$3 RETURNING xp,level", [xp, level, user.id]);
      await client.query("COMMIT");
      return NextResponse.json({ xp, level, levelsGained, amount: Math.floor(amount) });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Progress error", error);
    return NextResponse.json({ error: "Unable to update XP right now." }, { status: 500 });
  }
}
