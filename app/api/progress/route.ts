import { NextRequest, NextResponse } from "next/server";
import { ensureAuthSchema, pool } from "../auth/_db";
import { currentUser } from "../../../lib/auth-session";
import { getLevelRewardPlan, type MilestoneUnlock } from "../../../lib/levelRewards";

const XP_PER_GAME_WIN = 7;
const XP_PER_DIAMOND_PURCHASE = 15;

function requiredForLevel(level: number) { return 10 + Math.max(0, level) * 5; }

type Unlock = MilestoneUnlock;

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
          reward_type TEXT,
          reward_id TEXT,
          reward_name TEXT,
          compensation_gems INTEGER NOT NULL DEFAULT 0,
          title TEXT NOT NULL,
          claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY(user_id, level)
        );
        ALTER TABLE ludo_level_rewards ADD COLUMN IF NOT EXISTS reward_type TEXT;
        ALTER TABLE ludo_level_rewards ADD COLUMN IF NOT EXISTS reward_id TEXT;
        ALTER TABLE ludo_level_rewards ADD COLUMN IF NOT EXISTS reward_name TEXT;
        ALTER TABLE ludo_level_rewards ADD COLUMN IF NOT EXISTS compensation_gems INTEGER NOT NULL DEFAULT 0;
      `);

      const locked = await client.query<any>("SELECT xp,level,coins,gems,owned_boards,owned_dice,owned_avatars,owned_items FROM ludo_users WHERE id=$1 FOR UPDATE", [user.id]);
      const row = locked.rows[0];
      if (!row) throw new Error("Account not found.");
      let xp = Math.max(0, Number(row.xp) || 0) + amount;
      let level = Math.max(0, Number(row.level) || 0);
      const oldLevel = level;
      let levelsGained = 0;
      let rewardCoins = 0;
      let rewardGems = 0;
      const rewardBadges: string[] = [];
      const rewardUnlocks: Omit<Unlock, "fallbackGems">[] = [];
      const rewardCompensations: { type: Unlock["type"]; id: string; name: string; icon?: string; gems: number }[] = [];

      const owned = {
        board: Array.isArray(row.owned_boards) ? row.owned_boards.map(String) : ["classic"],
        dice: Array.isArray(row.owned_dice) ? row.owned_dice.map(String) : ["classic"],
        avatar: Array.isArray(row.owned_avatars) ? row.owned_avatars.map(String) : [],
        item: Array.isArray(row.owned_items) ? row.owned_items.map(String) : [],
      };

      while (xp >= requiredForLevel(level)) {
        xp -= requiredForLevel(level);
        level += 1;
        levelsGained += 1;

        const reward = getLevelRewardPlan(level);
        let compensationGems = 0;
        if (reward.unlock) {
          const list = owned[reward.unlock.type];
          if (list.includes(reward.unlock.id)) compensationGems = reward.unlock.fallbackGems;
        }

        const inserted = await client.query<any>(
          `INSERT INTO ludo_level_rewards(user_id,level,coins,gems,badge_id,reward_type,reward_id,reward_name,compensation_gems,title)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT(user_id,level) DO NOTHING
           RETURNING coins,gems,badge_id,reward_type,reward_id,reward_name,compensation_gems`,
          [user.id, level, reward.coins, reward.gems, reward.badge, reward.unlock?.type || null, reward.unlock?.id || null, reward.unlock?.name || null, compensationGems, `Level ${level} Reward`]
        );
        if (!inserted.rowCount) continue;

        rewardCoins += reward.coins;
        rewardGems += reward.gems + compensationGems;
        if (reward.badge) rewardBadges.push(reward.badge);

        if (reward.unlock) {
          const list = owned[reward.unlock.type];
          if (!compensationGems) {
            list.push(reward.unlock.id);
            rewardUnlocks.push({ type: reward.unlock.type, id: reward.unlock.id, name: reward.unlock.name, icon: reward.unlock.icon });
          } else {
            rewardCompensations.push({ type: reward.unlock.type, id: reward.unlock.id, name: reward.unlock.name, icon: reward.unlock.icon, gems: compensationGems });
          }
        }
      }

      await client.query(
        `UPDATE ludo_users
         SET xp=$1,level=$2,coins=coins+$3,gems=gems+$4,
             owned_boards=$5::jsonb,owned_dice=$6::jsonb,owned_avatars=$7::jsonb,owned_items=$8::jsonb
         WHERE id=$9`,
        [xp, level, rewardCoins, rewardGems, JSON.stringify(owned.board), JSON.stringify(owned.dice), JSON.stringify(owned.avatar), JSON.stringify(owned.item), user.id]
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
          unlocks: rewardUnlocks,
          compensations: rewardCompensations,
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
