import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool, ensureAuthSchema } from "../../auth/_db";

const COOKIE = "ludo_session";
const WINDOW_START = 17;
const WINDOW_END = 20;
const HEARTBEAT_CAP_SECONDS = 90;
const INTERVAL_SECONDS = 30 * 60;

async function getUserId(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const r = await pool.query<{ id: string }>(
    "SELECT u.id FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1",
    [hash]
  );
  return r.rows[0]?.id ?? null;
}

function nigeriaHour(date = new Date()) {
  return Number(new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", hour: "numeric", hour12: false }).format(date));
}

function isBoostWindow(date = new Date()) {
  const hour = nigeriaHour(date);
  return hour >= WINDOW_START && hour < WINDOW_END;
}

async function ensureActivityColumn() {
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_spin_state(
    user_id TEXT PRIMARY KEY REFERENCES ludo_users(id) ON DELETE CASCADE,
    last_free_spin DATE,
    spins INTEGER NOT NULL DEFAULT 0,
    total_spins INTEGER NOT NULL DEFAULT 0
  )`);
  await pool.query("ALTER TABLE ludo_spin_state ADD COLUMN IF NOT EXISTS active_seconds INTEGER NOT NULL DEFAULT 0");
  await pool.query("ALTER TABLE ludo_spin_state ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ");
}

export async function POST(request: NextRequest) {
  try {
    await ensureAuthSchema();
    const id = await getUserId(request);
    if (!id) return NextResponse.json({ ok: false, spins: 0 }, { status: 401 });
    await ensureActivityColumn();

    const now = new Date();
    const r = await pool.query<{ spins:number; active_seconds:number; last_heartbeat_at:Date|null }>(
      "SELECT spins,active_seconds,last_heartbeat_at FROM ludo_spin_state WHERE user_id=$1",
      [id]
    );
    const row = r.rows[0];
    const previous = row?.last_heartbeat_at ? new Date(row.last_heartbeat_at).getTime() : now.getTime();
    const elapsed = Math.max(0, Math.min(HEARTBEAT_CAP_SECONDS, Math.floor((now.getTime() - previous) / 1000)));
    let activeSeconds = Number(row?.active_seconds || 0) + elapsed;
    let spins = Number(row?.spins || 0);
    let granted = 0;

    if (activeSeconds >= INTERVAL_SECONDS) {
      const intervals = Math.floor(activeSeconds / INTERVAL_SECONDS);
      const amountPerInterval = isBoostWindow(now) ? 3 : 1;
      granted = intervals * amountPerInterval;
      spins += granted;
      activeSeconds -= intervals * INTERVAL_SECONDS;
    }

    await pool.query(
      `INSERT INTO ludo_spin_state(user_id,spins,total_spins,active_seconds,last_heartbeat_at)
       VALUES($1,$2,0,$3,$4)
       ON CONFLICT(user_id) DO UPDATE SET spins=$2,active_seconds=$3,last_heartbeat_at=$4`,
      [id, spins, activeSeconds, now]
    );

    return NextResponse.json({ ok:true, granted, spins, boostWindow:isBoostWindow(now) }, { headers:{"Cache-Control":"no-store"} });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok:false, error:"Activity reward unavailable." }, { status:500 });
  }
}
