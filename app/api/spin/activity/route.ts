import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { getLevelRewardPlan } from "../../../../lib/levelRewards";
import { ensureWalletAudit, markWalletContext } from "../../lib/wallet-audit";

const COOKIE = "ludo_session";
const WINDOW_START = 17;
const WINDOW_END = 20;
const HEARTBEAT_CAP_SECONDS = 90;
const INTERVAL_SECONDS = 30 * 60;
const NORMAL_SPINS = 1;
const NORMAL_XP = 2;
const RUSH_SPINS = 3;
const RUSH_XP = 6;
const DAILY_SPIN_CAP = 12;

async function getUserId(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const r = await pool.query<{ id: string }>("SELECT u.id FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1", [hash]);
  return r.rows[0]?.id ?? null;
}
function nigeriaHour(date = new Date()) { return Number(new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", hour: "numeric", hour12: false }).format(date)); }
function isRush(date = new Date()) { const hour = nigeriaHour(date); return hour >= WINDOW_START && hour < WINDOW_END; }
function dayKey(date = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(date); }

async function ensureActivitySchema() {
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_spin_state(user_id TEXT PRIMARY KEY REFERENCES ludo_users(id) ON DELETE CASCADE,last_free_spin DATE,spins INTEGER NOT NULL DEFAULT 0,total_spins INTEGER NOT NULL DEFAULT 0)`);
  await pool.query("ALTER TABLE ludo_spin_state ADD COLUMN IF NOT EXISTS active_seconds INTEGER NOT NULL DEFAULT 0");
  await pool.query("ALTER TABLE ludo_spin_state ADD COLUMN IF NOT EXISTS total_active_seconds INTEGER NOT NULL DEFAULT 0");
  await pool.query("ALTER TABLE ludo_spin_state ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE ludo_spin_state ADD COLUMN IF NOT EXISTS activity_reward_day DATE");
  await pool.query("ALTER TABLE ludo_spin_state ADD COLUMN IF NOT EXISTS activity_reward_spins INTEGER NOT NULL DEFAULT 0");
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_level_rewards(user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,level INTEGER NOT NULL,coins INTEGER NOT NULL DEFAULT 0,gems INTEGER NOT NULL DEFAULT 0,badge_id TEXT,reward_type TEXT,reward_id TEXT,reward_name TEXT,compensation_gems INTEGER NOT NULL DEFAULT 0,title TEXT NOT NULL,claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(user_id,level))`);
  await pool.query("ALTER TABLE ludo_level_rewards ADD COLUMN IF NOT EXISTS reward_type TEXT");
  await pool.query("ALTER TABLE ludo_level_rewards ADD COLUMN IF NOT EXISTS reward_id TEXT");
  await pool.query("ALTER TABLE ludo_level_rewards ADD COLUMN IF NOT EXISTS reward_name TEXT");
  await pool.query("ALTER TABLE ludo_level_rewards ADD COLUMN IF NOT EXISTS compensation_gems INTEGER NOT NULL DEFAULT 0");
}
function requiredForLevel(level: number) { return 20 + Math.max(1, Math.floor(Number(level) || 1)) * 10; }

export async function POST(request: NextRequest) {
  try {
    await ensureAuthSchema();
    const id = await getUserId(request);
    if (!id) return NextResponse.json({ ok: false, spins: 0 }, { status: 401 });
    await ensureActivitySchema();
    const now = new Date();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const stateResult = await client.query<{spins:number;active_seconds:number;total_active_seconds:number;last_heartbeat_at:Date|null;activity_reward_day:string|null;activity_reward_spins:number}>("SELECT spins,active_seconds,total_active_seconds,last_heartbeat_at,activity_reward_day,activity_reward_spins FROM ludo_spin_state WHERE user_id=$1 FOR UPDATE",[id]);
      const row = stateResult.rows[0];
      const previous = row?.last_heartbeat_at ? new Date(row.last_heartbeat_at).getTime() : now.getTime();
      const elapsed = Math.max(0, Math.min(HEARTBEAT_CAP_SECONDS, Math.floor((now.getTime() - previous) / 1000)));
      let activeSeconds = Number(row?.active_seconds || 0) + elapsed;
      const totalActiveSeconds = Number(row?.total_active_seconds || 0) + elapsed;
      let spins = Number(row?.spins || 0);
      let rewardDay = row?.activity_reward_day || dayKey(now);
      let rewardSpinsToday = Number(row?.activity_reward_spins || 0);
      if (rewardDay !== dayKey(now)) { rewardDay = dayKey(now); rewardSpinsToday = 0; }
      let granted = 0;
      let xpGranted = 0;

      if (activeSeconds >= INTERVAL_SECONDS && rewardSpinsToday < DAILY_SPIN_CAP) {
        const intervals = Math.floor(activeSeconds / INTERVAL_SECONDS);
        const grantableIntervals = Math.min(intervals, DAILY_SPIN_CAP - rewardSpinsToday);
        // The 3x rush multiplier is preserved, but only the intervals actually
        // granted during the rush window receive it. Banked time cannot be
        // multiplied repeatedly or converted after the daily activity cap.
        const rush = isRush(now);
        const spinsPerInterval = rush ? RUSH_SPINS : NORMAL_SPINS;
        const xpPerInterval = rush ? RUSH_XP : NORMAL_XP;
        granted = grantableIntervals * spinsPerInterval;
        xpGranted = grantableIntervals * xpPerInterval;
        spins += granted;
        rewardSpinsToday += grantableIntervals;
        activeSeconds -= grantableIntervals * INTERVAL_SECONDS;
      }

      let level = 1; let xp = 0; let rewardCoins = 0; let rewardGems = 0; const rewardLevels:number[]=[];
      if (xpGranted > 0) {
        const userResult = await client.query<any>("SELECT xp,level,coins,gems,owned_boards,owned_dice,owned_avatars,owned_items FROM ludo_users WHERE id=$1 FOR UPDATE",[id]);
        const user = userResult.rows[0]; if (!user) throw new Error("Account not found.");
        xp=Math.max(0,Number(user.xp)||0); level=Math.max(1,Number(user.level)||1);
        const owned={board:Array.isArray(user.owned_boards)?user.owned_boards.map(String):["classic"],dice:Array.isArray(user.owned_dice)?user.owned_dice.map(String):["classic"],avatar:Array.isArray(user.owned_avatars)?user.owned_avatars.map(String):[],item:Array.isArray(user.owned_items)?user.owned_items.map(String):[]};
        xp+=xpGranted;
        while(xp>=requiredForLevel(level)) {
          xp-=requiredForLevel(level); level+=1; rewardLevels.push(level);
          const reward=getLevelRewardPlan(level); let compensationGems=0;
          if(reward.unlock){const list=owned[reward.unlock.type];if(list.includes(reward.unlock.id))compensationGems=reward.unlock.fallbackGems;}
          const inserted=await client.query(`INSERT INTO ludo_level_rewards(user_id,level,coins,gems,badge_id,reward_type,reward_id,reward_name,compensation_gems,title) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(user_id,level) DO NOTHING RETURNING level`,[id,level,reward.coins,reward.gems,reward.badge,reward.unlock?.type||null,reward.unlock?.id||null,reward.unlock?.name||null,compensationGems,`Level ${level} Reward`]);
          if(inserted.rowCount){rewardCoins+=reward.coins;rewardGems+=reward.gems+compensationGems;if(reward.unlock&&!compensationGems)owned[reward.unlock.type].push(reward.unlock.id);}
        }
        await ensureWalletAudit(client);
        if(rewardCoins||rewardGems) await markWalletContext(client,{source:"activity_level_reward",sourceRef:`activity:${id}:level:${level}`,actorUserId:id,ip:(request.headers.get("x-forwarded-for")||request.headers.get("x-real-ip")||"").split(",")[0].trim(),userAgent:request.headers.get("user-agent")||"",reason:`Activity XP level reward: level ${level}`});
        await client.query(`UPDATE ludo_users SET xp=$1,level=$2,coins=coins+$3,gems=gems+$4,owned_boards=$5::jsonb,owned_dice=$6::jsonb,owned_avatars=$7::jsonb,owned_items=$8::jsonb WHERE id=$9`,[xp,level,rewardCoins,rewardGems,JSON.stringify(owned.board),JSON.stringify(owned.dice),JSON.stringify(owned.avatar),JSON.stringify(owned.item),id]);
      } else { const userResult=await client.query<{xp:number;level:number}>("SELECT xp,level FROM ludo_users WHERE id=$1",[id]);xp=Number(userResult.rows[0]?.xp||0);level=Math.max(1,Number(userResult.rows[0]?.level)||1); }

      await client.query(`INSERT INTO ludo_spin_state(user_id,spins,total_spins,active_seconds,total_active_seconds,last_heartbeat_at,activity_reward_day,activity_reward_spins) VALUES($1,$2,0,$3,$4,$5,$6,$7) ON CONFLICT(user_id) DO UPDATE SET spins=$2,active_seconds=$3,total_active_seconds=$4,last_heartbeat_at=$5,activity_reward_day=$6,activity_reward_spins=$7`,[id,spins,activeSeconds,totalActiveSeconds,now,rewardDay,rewardSpinsToday]);
      await client.query("COMMIT");
      return NextResponse.json({ok:true,granted,xpGranted,xp,level,levels:rewardLevels,spins,boostWindow:isRush(now),activeSeconds:totalActiveSeconds,activitySpinsToday:rewardSpinsToday,dailySpinCap:DAILY_SPIN_CAP},{headers:{"Cache-Control":"no-store"}});
    } catch(error){await client.query("ROLLBACK").catch(()=>{});throw error;} finally{client.release();}
  } catch(e){console.error(e);return NextResponse.json({ok:false,error:"Activity reward unavailable."},{status:500});}
}
