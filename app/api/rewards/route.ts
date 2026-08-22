import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool, ensureAuthSchema } from "../auth/_db";

const COOKIE = "ludo_session";
const TZ = "Africa/Lagos";

async function userId(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const r = await pool.query<{ id: string }>(
    "SELECT u.id FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1",
    [hash]
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

// PostgreSQL DATE values are commonly returned by node-postgres as Date objects.
// Never use String(date).slice(0, 10): that produces values such as "Sat Aug 22"
// rather than the ISO calendar date and makes an already-claimed reward look open.
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

const rewards = [1000, 1500, 5, 2000, 10, 3000, 5000];

async function ensureRewardSchema() {
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_daily_rewards(
    user_id TEXT PRIMARY KEY REFERENCES ludo_users(id) ON DELETE CASCADE,
    last_claim_date DATE,
    streak INTEGER NOT NULL DEFAULT 0,
    claimed_days INTEGER[] NOT NULL DEFAULT '{}'
  )`);
  await pool.query(
    "ALTER TABLE ludo_daily_rewards ADD COLUMN IF NOT EXISTS claimed_days INTEGER[] NOT NULL DEFAULT '{}'"
  );
}

export async function GET(request: NextRequest) {
  try {
    await ensureAuthSchema();
    const id = await userId(request);
    if (!id) return NextResponse.json({ error: "Sign in to view your rewards." }, { status: 401 });
    await ensureRewardSchema();

    const r = await pool.query(
      "SELECT last_claim_date,streak,claimed_days FROM ludo_daily_rewards WHERE user_id=$1",
      [id]
    );
    let row = r.rows[0];
    const today = dayKey();
    const td = new Date(today + "T00:00:00.000Z");
    const lastClaimKey = dbDateKey(row?.last_claim_date);
    const lastClaimDate = dateValue(row?.last_claim_date);

    if (lastClaimDate && dayDiff(td, lastClaimDate) > 1) {
      await pool.query(
        "UPDATE ludo_daily_rewards SET streak=0,claimed_days='{}' WHERE user_id=$1",
        [id]
      );
      row = { ...row, streak: 0, claimed_days: [] };
    }

    const claimed = lastClaimKey === today;
    return NextResponse.json({
      claimed,
      streak: row?.streak ?? 0,
      claimedDays: row?.claimed_days ?? [],
      days: rewards,
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

    // Initialize before locking. This makes the row lockable even on a player's
    // first-ever claim, preventing two simultaneous first claims from both winning.
    await client.query(
      "INSERT INTO ludo_daily_rewards(user_id,streak,claimed_days) VALUES($1,0,'{}') ON CONFLICT(user_id) DO NOTHING",
      [id]
    );

    const r = await client.query(
      "SELECT last_claim_date,streak,claimed_days FROM ludo_daily_rewards WHERE user_id=$1 FOR UPDATE",
      [id]
    );
    const row = r.rows[0];
    const lastClaimKey = dbDateKey(row?.last_claim_date);
    const lastClaimDate = dateValue(row?.last_claim_date);

    // The row is locked and the DATE is normalized correctly. A player can now
    // successfully claim at most once for each Africa/Lagos calendar day.
    if (lastClaimKey === today) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Daily reward already claimed." }, { status: 409 });
    }

    let streak = 1;
    let claimedDays: number[] = [];

    if (lastClaimDate) {
      const diff = dayDiff(td, lastClaimDate);
      if (diff === 1 && row.streak < 7) {
        streak = row.streak + 1;
        claimedDays = Array.isArray(row.claimed_days) ? row.claimed_days : [];
      }
      // diff > 1 intentionally starts a fresh 7-day streak.
    }

    const amount = rewards[streak - 1];
    const currency = amount === 5 || amount === 10 ? "gems" : "coins";
    const beforeR = await client.query<any>(
      `SELECT ${currency} FROM ludo_users WHERE id=$1 FOR UPDATE`,
      [id]
    );
    if (!beforeR.rows[0]) throw new Error("USER_NOT_FOUND");

    const before = Number(beforeR.rows[0][currency]);
    claimedDays = Array.from(new Set([...claimedDays, streak]));

    await client.query(
      "UPDATE ludo_daily_rewards SET last_claim_date=$2,streak=$3,claimed_days=$4 WHERE user_id=$1",
      [id, today, streak, claimedDays]
    );
    await client.query(`UPDATE ludo_users SET ${currency}=${currency}+$2 WHERE id=$1`, [id, amount]);
    await client.query(
      "INSERT INTO ludo_admin_ledger(user_id,currency,amount,balance_before,balance_after,reason,source) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [id, currency, amount, before, before + amount, `Daily reward Day ${streak}`, "daily_reward"]
    );

    await client.query("COMMIT");
    return NextResponse.json({
      claimed: true,
      streak,
      amount,
      kind: currency,
      claimedDays,
      balance: before + amount,
    });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    return NextResponse.json({ error: "Could not claim reward." }, { status: 500 });
  } finally {
    client.release();
  }
}
