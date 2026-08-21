import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { pool, ensureAuthSchema } from "../auth/_db";

const COOKIE = "ludo_session";
const BROWSER_COOKIE = "ludo_spin_browser";

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

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

function browserKey(request: NextRequest) {
  return request.cookies.get(BROWSER_COOKIE)?.value || randomUUID();
}

function withBrowserCookie(response: NextResponse, key: string, shouldSet: boolean) {
  if (shouldSet) {
    response.cookies.set(BROWSER_COOKIE, key, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

const prizes = [
  { id: "coins1000", label: "1,000", icon: "🪙", kind: "coins", amount: 1000 },
  { id: "gems5", label: "5", icon: "💎", kind: "gems", amount: 5 },
  { id: "coins2000", label: "2,000", icon: "🪙", kind: "coins", amount: 2000 },
  { id: "gems10", label: "10", icon: "💎", kind: "gems", amount: 10 },
  { id: "coins5000", label: "5,000", icon: "🪙", kind: "coins", amount: 5000 },
  { id: "gems15", label: "15", icon: "💎", kind: "gems", amount: 15 },
  { id: "coins3000", label: "3,000", icon: "🪙", kind: "coins", amount: 3000 },
  { id: "mystery", label: "MYSTERY", icon: "🎁", kind: "mystery", amount: 1 },
];

async function ensureTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_spin_state(
    user_id TEXT PRIMARY KEY REFERENCES ludo_users(id) ON DELETE CASCADE,
    last_free_spin DATE,
    spins INTEGER NOT NULL DEFAULT 0,
    total_spins INTEGER NOT NULL DEFAULT 0
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_spin_visitor_state(
    browser_key TEXT PRIMARY KEY,
    last_spin DATE,
    total_spins INTEGER NOT NULL DEFAULT 0
  )`);
}

export async function GET(request: NextRequest) {
  try {
    await ensureAuthSchema();
    await ensureTables();
    const id = await userId(request);
    const today = dayKey();

    if (id) {
      const r = await pool.query("SELECT last_free_spin,spins,total_spins FROM ludo_spin_state WHERE user_id=$1", [id]);
      let row = r.rows[0];
      if (!row) {
        await pool.query("INSERT INTO ludo_spin_state(user_id,last_free_spin,spins,total_spins) VALUES($1,$2,1,0)", [id, today]);
        row = { last_free_spin: today, spins: 1, total_spins: 0 };
      } else if (String(row.last_free_spin).slice(0, 10) !== today) {
        await pool.query("UPDATE ludo_spin_state SET last_free_spin=$2,spins=1 WHERE user_id=$1", [id, today]);
        row = { ...row, last_free_spin: today, spins: 1 };
      }
      return NextResponse.json({ spins: Number(row.spins), totalSpins: Number(row.total_spins), visitor: false });
    }

    const key = browserKey(request);
    const r = await pool.query("SELECT last_spin,total_spins FROM ludo_spin_visitor_state WHERE browser_key=$1", [key]);
    const row = r.rows[0];
    const ready = !row || String(row.last_spin).slice(0, 10) !== today;
    const response = NextResponse.json({ spins: ready ? 1 : 0, totalSpins: Number(row?.total_spins || 0), visitor: true });
    return withBrowserCookie(response, key, !request.cookies.get(BROWSER_COOKIE)?.value);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Spin wheel unavailable." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureAuthSchema();
    await ensureTables();
    const id = await userId(request);
    const today = dayKey();
    const prize = prizes[Math.floor(Math.random() * prizes.length)];

    if (id) {
      await pool.query("INSERT INTO ludo_spin_state(user_id,last_free_spin,spins,total_spins) VALUES($1,$2,1,0) ON CONFLICT DO NOTHING", [id, today]);
      const state = await pool.query("SELECT last_free_spin,spins,total_spins FROM ludo_spin_state WHERE user_id=$1 FOR UPDATE", [id]);
      let row = state.rows[0];
      if (String(row.last_free_spin).slice(0, 10) !== today) {
        await pool.query("UPDATE ludo_spin_state SET last_free_spin=$2,spins=1 WHERE user_id=$1", [id, today]);
        row = { ...row, last_free_spin: today, spins: 1 };
      }
      if (Number(row.spins || 0) < 1) return NextResponse.json({ error: "No spin available today." }, { status: 409 });

      await pool.query("UPDATE ludo_spin_state SET spins=0,total_spins=total_spins+1 WHERE user_id=$1", [id]);
      if (prize.kind === "coins") await pool.query("UPDATE ludo_users SET coins=coins+$2 WHERE id=$1", [id, prize.amount]);
      else if (prize.kind === "gems") await pool.query("UPDATE ludo_users SET gems=gems+$2 WHERE id=$1", [id, prize.amount]);
      return NextResponse.json({ prize, spins: 0 });
    }

    const key = browserKey(request);
    await pool.query("INSERT INTO ludo_spin_visitor_state(browser_key,last_spin,total_spins) VALUES($1,$2,0) ON CONFLICT DO NOTHING", [key, today]);
    const state = await pool.query("SELECT last_spin,total_spins FROM ludo_spin_visitor_state WHERE browser_key=$1 FOR UPDATE", [key]);
    const row = state.rows[0];
    if (String(row.last_spin).slice(0, 10) === today) {
      const response = NextResponse.json({ error: "This browser has already used today's spin." }, { status: 409 });
      return withBrowserCookie(response, key, !request.cookies.get(BROWSER_COOKIE)?.value);
    }

    await pool.query("UPDATE ludo_spin_visitor_state SET last_spin=$2,total_spins=total_spins+1 WHERE browser_key=$1", [key, today]);
    const response = NextResponse.json({ prize, spins: 0, visitor: true });
    return withBrowserCookie(response, key, !request.cookies.get(BROWSER_COOKIE)?.value);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not complete spin." }, { status: 500 });
  }
}
