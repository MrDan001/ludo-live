import { NextRequest, NextResponse } from "next/server";
import { ensureAuthSchema, pool } from "../auth/_db";
import { currentUser } from "../../../lib/auth-session";

const XP_PER_GAME_WIN = 7;
const XP_PER_DIAMOND_PURCHASE = 15;

function requiredForLevel(level: number) { return 10 + Math.max(0, level) * 5; }

function levelReward(level: number) {
  const coins = 250 + Math.max(0, level - 1) * 50;
  const gems = level % 5 === 0 ? 10 + Math.floor(level / 10) * 5 : 0;
  const badge = level % 10 === 0 ? `level-${level}` : null;
  return { coins, gems, badge };
}

export async function POST(request: NextRequest) {
  try {
    await ensureAuthSchema();
    const user = await currentUser(request);
    if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const source = String(body?.source || "");
    const amount = source === "game_win" ? XP_PER_GAME_WIN : source === "diamond_purchase" ? XP_PER_DIAMOND_PURCHASE : 0;
    if (!amount) return NextResponse.json({ error: "Invalid XP award source." }, { status: 400 });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`
        CREATE TABLE IF NOT EXISTS ludo_level_rewards(
          user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
          level INTEGER NOT NULL,
          coins INTEGER NOT NULL DEFAULT 0,
          gems INTEGER NOT NULL DEFAULT 0,
          badge_id TEXT,
          title TEXT NOT NULL,
          claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY(user_id, level)
        )
      `);

      const locked = await client.query<any>("SELECT xp,level,coins,gems FROM ludo_users WHERE id=$1 FOR UPDATE", [user.id]);
      const row = locked.rows[0];
      if (!row) throw new Error("Account not found.");
      let xp = Math.max(0, Number(row.xp) || 0) + amount;
      let level = Math.max(0, Number(row.level) || 0);
      const oldLevel = level;
      let levelsGained = 0;
      let rewardCoins = 0;
      let rewardGems = 0;
      const rewardBadges: string[] = [];

      while (xp >= requiredForLevel(level)) {
        xp -= requiredForLevel(level);
        level += 1;
        levelsGained += 1;

        const reward = levelReward(level);
        const inserted = await client.query<any>(
          `INSERT INTO ludo_level_rewards(user_id,level,coins,gems,badge_id,title)
           VALUES($1,$2,$3,$4,$5,$6)
           ON CONFLICT(user_id,level) DO NOTHING
           RETURNING coins,gems,badge_id`,
          [user.id, level, reward.coins, reward.gems, reward.badge, `Level ${level} Reward`]
        );
        if (inserted.rowCount) {
          rewardCoins += reward.coins;
          rewardGems += reward.gems;
          if (reward.badge) rewardBadges.push(reward.badge);
        }
      }

      await client.query(
        "UPDATE ludo_users SET xp=$1,level=$2,coins=coins+$3,gems=gems+$4 WHERE id=$5",
        [xp, level, rewardCoins, rewardGems, user.id]
      );
      await client.query("COMMIT");
      return NextResponse.json({
        xp,
        level,
        levelsGained,
        amount,
        reward: {
          coins: rewardCoins,
          gems: rewardGems,
          badges: rewardBadges,
          levels: Array.from({ length: Math.max(0, level - oldLevel) }, (_, i) => oldLevel + i + 1),
        },
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally { client.release(); }
  } catch (error) {
    console.error("Progress error", error);
    return NextResponse.json({ error: "Unable to update XP right now." }, { status: 500 });
  }
}
