import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool, ensureAuthSchema } from "../../auth/_db";

const COOKIE = "ludo_session";

async function currentUser(q: NextRequest) {
  const token = q.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const r = await pool.query<any>(`SELECT u.* FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1`, [hash]);
  return r.rows[0] || null;
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ludo_player_notifications(
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
      admin_user_id TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'admin',
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ludo_player_notifications_user_idx ON ludo_player_notifications(user_id, created_at DESC);
  `);
}

export async function GET(q: NextRequest) {
  try {
    await ensureAuthSchema();
    await ensureSchema();
    const u = await currentUser(q);
    if (!u) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const r = await pool.query(`SELECT id,title,message,kind,created_at FROM ludo_player_notifications WHERE user_id=$1 AND read_at IS NULL ORDER BY created_at DESC LIMIT 10`, [u.id]);
    return NextResponse.json({ ok: true, notifications: r.rows });
  } catch (e) {
    console.error("notifications GET", e);
    return NextResponse.json({ error: "Notification service unavailable." }, { status: 500 });
  }
}

export async function POST(q: NextRequest) {
  try {
    await ensureAuthSchema();
    await ensureSchema();
    const u = await currentUser(q);
    if (!u) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const b = await q.json();
    if (b.all) await pool.query(`UPDATE ludo_player_notifications SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL`, [u.id]);
    else if (b.id) await pool.query(`UPDATE ludo_player_notifications SET read_at=NOW() WHERE user_id=$1 AND id=$2`, [u.id, String(b.id)]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("notifications POST", e);
    return NextResponse.json({ error: "Unable to update notification." }, { status: 500 });
  }
}
