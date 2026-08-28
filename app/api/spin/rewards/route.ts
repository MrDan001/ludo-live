import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { getShopItem } from "../../shop/catalog";

const COOKIE = "ludo_session";
async function authUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const r = await pool.query<any>(`SELECT u.* FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1`, [hash]);
  return r.rows[0] || null;
}
async function ensureTables() {
  await ensureAuthSchema();
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_spin_item_rewards(
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_icon TEXT,
    won_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at TIMESTAMPTZ,
    UNIQUE(id)
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS ludo_spin_item_rewards_pending_idx ON ludo_spin_item_rewards(user_id,claimed_at,won_at DESC)`);
}
export async function GET(request: NextRequest) {
  try {
    const u = await authUser(request);
    if (!u || u.is_guest) return NextResponse.json({ error: "A registered account is required." }, { status: 403 });
    await ensureTables();
    const pending = await pool.query(`SELECT id,item_type AS "itemType",item_id AS "itemId",item_name AS "itemName",item_icon AS "itemIcon",won_at AS "wonAt" FROM ludo_spin_item_rewards WHERE user_id=$1 AND claimed_at IS NULL ORDER BY won_at DESC`, [u.id]);
    const history = await pool.query(`SELECT id,item_type AS "itemType",item_id AS "itemId",item_name AS "itemName",item_icon AS "itemIcon",won_at AS "wonAt",claimed_at AS "claimedAt" FROM ludo_spin_item_rewards WHERE user_id=$1 AND claimed_at IS NOT NULL ORDER BY claimed_at DESC`, [u.id]);
    return NextResponse.json({ pending: pending.rows, history: history.rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Unable to load Spin Rewards." }, { status: 500 }); }
}
export async function POST(request: NextRequest) {
  const client = await pool.connect(); let tx = false;
  try {
    const u = await authUser(request);
    if (!u || u.is_guest) return NextResponse.json({ error: "A registered account is required." }, { status: 403 });
    await ensureTables();
    const body = await request.json().catch(() => ({}));
    const rewardId = Number(body.id);
    if (!Number.isInteger(rewardId) || rewardId < 1) return NextResponse.json({ error: "Invalid Spin Reward." }, { status: 400 });
    await client.query("BEGIN"); tx = true;
    const r = await client.query(`SELECT id,item_type,item_id,item_name,item_icon,claimed_at FROM ludo_spin_item_rewards WHERE id=$1 AND user_id=$2 FOR UPDATE`, [rewardId, u.id]);
    const reward = r.rows[0];
    if (!reward) return fail(client, "Spin Reward not found.", 404);
    if (reward.claimed_at) return fail(client, "This Spin Reward has already been claimed.", 409);
    const item: any = await getShopItem(String(reward.item_type), String(reward.item_id));
    if (!item) return fail(client, "The Shop item is no longer available.", 404);
    const type = String(reward.item_type);
    const id = String(reward.item_id);
    const column = type === "board" ? "owned_boards" : type === "dice" ? "owned_dice" : type === "avatar" ? "owned_avatars" : "owned_items";
    const owned = Array.isArray(u[column]) ? u[column].map(String) : [];
    const next = owned.includes(id) ? owned : [...owned, id];
    await client.query(`UPDATE ludo_users SET ${column}=$1::jsonb WHERE id=$2`, [JSON.stringify(next), u.id]);
    await client.query(`UPDATE ludo_spin_item_rewards SET claimed_at=NOW() WHERE id=$1`, [rewardId]);
    await client.query(`INSERT INTO ludo_admin_actions(admin_user_id,action,target_user_id,details) VALUES(NULL,'spin_item_claim',$1,$2)`, [u.id, JSON.stringify({ rewardId, type, id, name: reward.item_name })]);
    await client.query("COMMIT"); tx = false;
    return NextResponse.json({ ok: true, item, claimedAt: new Date().toISOString() });
  } catch (e: any) { if (tx) await client.query("ROLLBACK").catch(() => {}); console.error(e); return NextResponse.json({ error: e?.message || "Unable to claim Spin Reward." }, { status: Number(e?.status) || 500 }); }
  finally { client.release(); }
}
async function fail(client: any, message: string, status: number): Promise<never> { await client.query("ROLLBACK").catch(() => {}); throw Object.assign(new Error(message), { status }); }
