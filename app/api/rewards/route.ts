import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool, ensureAuthSchema } from "../auth/_db";
import { ensureWalletAudit, markWalletContext } from "../lib/wallet-audit";

const COOKIE = "ludo_session";
const TZ = "Africa/Lagos";
const rewards = [1000, 1500, 5, 2000, 10, 3000, 5000];
const SEVEN_DAY_BONUS = { coins: 10000, gems: 25 };

async function userId(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const r = await pool.query<{ id: string }>(
    "SELECT u.id FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1",
    [hash],
  );
  return r.rows[0]?.id ?? null;
}

function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dbDateKey(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function dateValue(value: unknown) {
  const key = dbDateKey(value);
  return key ? new Date(key + "T00:00:00.000Z") : null;
}

function dayDiff(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

async function ensureRewardSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ludo_daily_rewards(
      user_id TEXT PRIMARY KEY REFERENCES ludo_users(id) ON DELETE CASCADE,
      last_claim_date DATE,
      streak INTEGER NOT NULL DEFAULT 0,
      claimed_days INTEGER[] NOT NULL DEFAULT '{}',
      streak_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
  await pool.query("ALTER TABLE ludo_daily_rewards ADD COLUMN IF NOT EXISTS claimed_days INTEGER[] NOT NULL DEFAULT '{}'");
  await pool.query("ALTER TABLE ludo_daily_rewards ADD COLUMN IF NOT EXISTS streak_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE");
}

export async function GET(request: NextRequest) {
  try {
    await ensureAuthSchema();
    const id = await userId(request);
    if (!id) return NextResponse.json({ error: "Sign in to view your rewards." }, { status: 401 });
    await ensureRewardSchema();

    const r = await pool.query(
      "SELECT last_claim_date,streak,claimed_days,streak_bonus_claimed FROM ludo_daily_rewards WHERE user_id=$1",
      [id],
    );
    let row = r.rows[0];
    const today = dayKey();
    const td = new Date(today + "T00:00:00.000Z");
    const lastClaimKey = dbDateKey(row?.last_claim_date);
    const lastClaimDate = dateValue(row?.last_claim_date);

    if (lastClaimDate && dayDiff(td, lastClaimDate) > 1) {
      await pool.query(
        "UPDATE ludo_daily_rewards SET streak=0,claimed_days='{}',streak_bonus_claimed=FALSE WHERE user_id=$1",
        [id],
      );
      row = { ...row, streak: 0, claimed_days: [], streak_bonus_claimed: false };
    }

    return NextResponse.json({
      claimed: lastClaimKey === today,
      streak: row?.streak ?? 0,
      claimedDays: row?.claimed_days ?? [],
      days: rewards,
      bonus: {
        coins: SEVEN_DAY_BONUS.coins,
        gems: SEVEN_DAY_BONUS.gems,
        claimed: Boolean(row?.streak_bonus_claimed),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Rewards unavailable." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    await ensureAuthSchema();
    const id = await userId(request);
    if (!id) return NextResponse.json({ error: "Sign in to claim your reward." }, { status: 401 });
    await ensureRewardSchema();
    await client.query("BEGIN");

    const today = dayKey();
    const td = new Date(today + "T00:00:00.000Z");

    await client.query(
      "INSERT INTO ludo_daily_rewards(user_id,streak,claimed_days,streak_bonus_claimed) VALUES($1,0,'{}',FALSE) ON CONFLICT(user_id) DO NOTHING",
      [id],
    );

    const r = await client.query(
      "SELECT last_claim_date,streak,claimed_days,streak_bonus_claimed FROM ludo_daily_rewards WHERE user_id=$1 FOR UPDATE",
      [id],
    );
    const row = r.rows[0];
    const lastClaimKey = dbDateKey(row?.last_claim_date);
    const lastClaimDate = dateValue(row?.last_claim_date);

    if (lastClaimKey === today) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Daily reward already claimed." }, { status: 409 });
    }

    let streak = 1;
    let claimedDays: number[] = [];
    let bonusAlreadyClaimed = false;

    if (lastClaimDate) {
      const diff = dayDiff(td, lastClaimDate);
      if (diff === 1 && Number(row?.streak || 0) >= 1 && Number(row?.streak || 0) < 7) {
        streak = Number(row.streak) + 1;
        claimedDays = Array.isArray(row.claimed_days) ? row.claimed_days : [];
        bonusAlreadyClaimed = Boolean(row.streak_bonus_claimed);
      }
    }

    const baseAmount = rewards[streak - 1];
    const baseCurrency = baseAmount === 5 || baseAmount === 10 ? "gems" : "coins";
    const bonusAwarded = streak === 7 && !bonusAlreadyClaimed;
    const bonusCoins = bonusAwarded ? SEVEN_DAY_BONUS.coins : 0;
    const bonusGems = bonusAwarded ? SEVEN_DAY_BONUS.gems : 0;
    const coinDelta = (baseCurrency === "coins" ? baseAmount : 0) + bonusCoins;
    const gemDelta = (baseCurrency === "gems" ? baseAmount : 0) + bonusGems;

    const beforeR = await client.query<{ coins: number; gems: number }>(
      "SELECT coins,gems FROM ludo_users WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (!beforeR.rows[0]) throw new Error("USER_NOT_FOUND");

    const beforeCoins = Number(beforeR.rows[0].coins || 0);
    const beforeGems = Number(beforeR.rows[0].gems || 0);
    const afterCoins = beforeCoins + coinDelta;
    const afterGems = beforeGems + gemDelta;

    claimedDays = Array.from(new Set([...claimedDays, streak]));
    await client.query(
      "UPDATE ludo_daily_rewards SET last_claim_date=$2,streak=$3,claimed_days=$4,streak_bonus_claimed=$5 WHERE user_id=$1",
      [id, today, streak, claimedDays, bonusAwarded ? true : streak === 1 ? false : bonusAlreadyClaimed],
    );

    await ensureWalletAudit(client);
    await markWalletContext(client, {
      source: "daily_reward",
      sourceRef: `day:${today}:streak:${streak}${bonusAwarded ? ":faithful-bonus" : ""}`,
      actorUserId: id,
      ip: (request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "").split(",")[0].trim(),
      userAgent: request.headers.get("user-agent") || "",
      reason: bonusAwarded ? "Daily reward Day 7 + 7-Day Faithful Bonus" : `Daily reward Day ${streak}`,
    });

    await client.query(
      "UPDATE ludo_users SET coins=$1,gems=$2 WHERE id=$3",
      [afterCoins, afterGems, id],
    );

    if (coinDelta > 0) {
      await client.query(
        "INSERT INTO ludo_admin_ledger(user_id,currency,amount,balance_before,balance_after,reason,source) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [id, "coins", coinDelta, beforeCoins, afterCoins, bonusAwarded ? "Daily reward Day 7 + 7-Day Faithful Bonus" : `Daily reward Day ${streak}`, "daily_reward"],
      );
    }
    if (gemDelta > 0) {
      await client.query(
        "INSERT INTO ludo_admin_ledger(user_id,currency,amount,balance_before,balance_after,reason,source) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [id, "gems", gemDelta, beforeGems, afterGems, bonusAwarded ? "Daily reward Day 7 + 7-Day Faithful Bonus" : `Daily reward Day ${streak}`, "daily_reward"],
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      claimed: true,
      streak,
      amount: baseAmount,
      kind: baseCurrency,
      claimedDays,
      balance: baseCurrency === "coins" ? afterCoins : afterGems,
      bonusAwarded,
      bonusCoins,
      bonusGems,
      totalCoinsAwarded: coinDelta,
      totalGemsAwarded: gemDelta,
    });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(e);
    return NextResponse.json({ error: "Could not claim reward." }, { status: 500 });
  } finally {
    client.release();
  }
}
