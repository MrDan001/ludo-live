import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool, ensureAuthSchema } from "../../auth/_db";

const COOKIE = "ludo_session";

async function admin(q: NextRequest) {
  const token = q.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const r = await pool.query<any>(
    `SELECT u.* FROM ludo_users u
     JOIN ludo_sessions s ON s.user_id=u.id
     WHERE s.token_hash=$1 AND s.expires_at>NOW()
     LIMIT 1`,
    [hash],
  );
  const u = r.rows[0];
  if (!u || u.is_guest || u.is_banned) return null;
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  return u.email && allowed.includes(u.email.toLowerCase()) ? u : null;
}

export async function GET(q: NextRequest) {
  try {
    await ensureAuthSchema();
    const a = await admin(q);
    if (!a) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const visitors = await pool.query<any>(`
      SELECT id, username, created_at, last_seen_at, coins, gems
      FROM ludo_users
      WHERE is_guest=TRUE
      ORDER BY last_seen_at DESC NULLS LAST, created_at DESC
      LIMIT 500
    `);

    return NextResponse.json({
      visitors: visitors.rows,
      count: visitors.rowCount || 0,
    });
  } catch (e) {
    console.error("Admin visitors GET error", e);
    return NextResponse.json({ error: "Unable to load visitors." }, { status: 500 });
  }
}

export async function DELETE(q: NextRequest) {
  try {
    await ensureAuthSchema();
    const a = await admin(q);
    if (!a) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const id = new URL(q.url).searchParams.get("id")?.trim();
    if (!id) return NextResponse.json({ error: "Visitor id is required." }, { status: 400 });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const visitor = await client.query<any>(
        `SELECT id, username, is_guest FROM ludo_users WHERE id=$1 FOR UPDATE`,
        [id],
      );

      if (!visitor.rowCount) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Visitor not found." }, { status: 404 });
      }
      if (!visitor.rows[0].is_guest) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Only visitor accounts can be deleted here." }, { status: 400 });
      }

      await client.query("DELETE FROM ludo_sessions WHERE user_id=$1", [id]);
      await client.query(
        `INSERT INTO ludo_admin_actions(admin_user_id,action,target_user_id,details)
         VALUES($1,'delete_visitor',$2,$3)`,
        [a.id, id, JSON.stringify({ username: visitor.rows[0].username })],
      );
      await client.query("DELETE FROM ludo_users WHERE id=$1 AND is_guest=TRUE", [id]);
      await client.query("COMMIT");

      return NextResponse.json({ ok: true });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("Admin visitors DELETE error", e);
    return NextResponse.json({ error: "Unable to delete visitor." }, { status: 500 });
  }
}
