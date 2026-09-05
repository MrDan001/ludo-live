import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SPIN_WHEEL, SPIN_SLOT_COUNT, weightedPick, type SpinWheelSlot } from "../../../lib/spinWheel";
import { pool, ensureAuthSchema } from "../auth/_db";
import { getShopCatalog } from "../shop/catalog";
import { adjustWallet, requestMeta } from "../lib/wallet-audit";

const COOKIE = "ludo_session";
type DbSlot = SpinWheelSlot & { updatedAt: string };

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const result = await pool.query<any>(`SELECT u.* FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1`, [hash]);
  return result.rows[0] || null;
}

async function ensureSchema() {
  await ensureAuthSchema();
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_spin_state(user_id TEXT PRIMARY KEY REFERENCES ludo_users(id) ON DELETE CASCADE,last_free_spin DATE,spins INTEGER NOT NULL DEFAULT 0,total_spins INTEGER NOT NULL DEFAULT 0)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_spin_item_rewards(id BIGSERIAL PRIMARY KEY,user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,item_type TEXT NOT NULL,item_id TEXT NOT NULL,item_name TEXT NOT NULL,item_icon TEXT,won_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),claimed_at TIMESTAMPTZ)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS ludo_spin_item_rewards_pending_idx ON ludo_spin_item_rewards(user_id,claimed_at,won_at DESC)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_spin_wheel_slots(slot INTEGER PRIMARY KEY CHECK(slot BETWEEN 0 AND 7),id TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('coins','gems','extraSpin','shop_item')),label TEXT NOT NULL,icon TEXT NOT NULL,amount INTEGER NOT NULL DEFAULT 0,probability NUMERIC NOT NULL DEFAULT 1,item_type TEXT,item_id TEXT,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  for (const reward of DEFAULT_SPIN_WHEEL) {
    await pool.query(`INSERT INTO ludo_spin_wheel_slots(slot,id,kind,label,icon,amount,probability,item_type,item_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(slot) DO NOTHING`, [reward.slot, reward.id, reward.kind, reward.label, reward.icon, reward.amount, reward.probability, reward.itemType || null, reward.itemId || null]);
  }
  // The former configurable reward table is intentionally retired; the fixed eight-slot table above is now the sole wheel configuration source.
  await pool.query(`DROP TABLE IF EXISTS ludo_spin_rewards`);
}

async function getWheel(db = pool): Promise<{ wheel: DbSlot[]; version: string }> {
  const result = await db.query<DbSlot>(`SELECT slot,id,kind,label,icon,amount,probability,item_type AS "itemType",item_id AS "itemId",updated_at AS "updatedAt" FROM ludo_spin_wheel_slots ORDER BY slot ASC`);
  const wheel = result.rows.map((row) => ({ ...row, amount: Number(row.amount), probability: Number(row.probability) }));
  const version = wheel.reduce((latest, row) => row.updatedAt > latest ? row.updatedAt : latest, "");
  return { wheel, version };
}

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();
    const user = await getUser(request);
    if (!user || user.is_guest) return NextResponse.json({ error: "A registered account is required to use Spin Wheel." }, { status: 403 });
    const state = await pool.query(`SELECT spins,total_spins FROM ludo_spin_state WHERE user_id=$1`, [user.id]);
    const { wheel, version } = await getWheel();
    return NextResponse.json({ serverTime: new Date().toISOString(), spins: Number(state.rows[0]?.spins || 0), totalSpins: Number(state.rows[0]?.total_spins || 0), wheel, wheelVersion: version }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Spin Wheel is unavailable." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  let transaction = false;
  try {
    await ensureSchema();
    const user = await getUser(request);
    if (!user || user.is_guest) return NextResponse.json({ error: "A registered account is required to use Spin Wheel." }, { status: 403 });

    await client.query("BEGIN");
    transaction = true;
    const { wheel, version } = await getWheel(client);
    if (wheel.length !== SPIN_SLOT_COUNT) throw new Error("Spin Wheel configuration is incomplete. Exactly 8 rewards are required.");
    if (wheel.some((item) => item.probability <= 0)) throw new Error("Spin Wheel configuration contains an invalid probability.");

    const state = await client.query(`SELECT spins,total_spins FROM ludo_spin_state WHERE user_id=$1 FOR UPDATE`, [user.id]);
    const currentSpins = Number(state.rows[0]?.spins || 0);
    if (currentSpins < 1) {
      await client.query("ROLLBACK");
      transaction = false;
      return NextResponse.json({ error: "No free spin available. Stay active to earn another one." }, { status: 409 });
    }

    const prizeIndex = weightedPick(wheel);
    if (prizeIndex < 0) throw new Error("Spin Wheel configuration has no valid reward weight.");
    const prize = wheel[prizeIndex];
    const catalog = prize.kind === "shop_item" ? await getShopCatalog() : null;
    if (prize.kind === "shop_item") {
      const item = catalog?.find((entry: any) => entry.type === prize.itemType && entry.id === prize.itemId);
      if (!item) throw new Error("This Spin Wheel Shop reward is no longer available. Ask an admin to update that slot.");
    }

    let nextSpins = currentSpins - 1;
    await client.query(`UPDATE ludo_spin_state SET spins=$1,total_spins=total_spins+1 WHERE user_id=$2`, [nextSpins, user.id]);

    if (prize.kind === "coins" || prize.kind === "gems") {
      await adjustWallet(client, user.id, prize.kind, prize.amount, { source: "spin_wheel", sourceRef: prize.id, reason: `Spin Wheel reward: ${prize.label}`, ...requestMeta(request) });
    } else if (prize.kind === "extraSpin") {
      nextSpins += prize.amount;
      await client.query(`UPDATE ludo_spin_state SET spins=$1 WHERE user_id=$2`, [nextSpins, user.id]);
    } else {
      const item = catalog!.find((entry: any) => entry.type === prize.itemType && entry.id === prize.itemId)!;
      await client.query(`INSERT INTO ludo_spin_item_rewards(user_id,item_type,item_id,item_name,item_icon) VALUES($1,$2,$3,$4,$5)`, [user.id, prize.itemType, prize.itemId, prize.label || item.name, prize.icon || item.icon || "✨"]);
    }

    const finalState = await client.query(`SELECT spins,total_spins FROM ludo_spin_state WHERE user_id=$1`, [user.id]);
    await client.query("COMMIT");
    transaction = false;

    return NextResponse.json({
      serverTime: new Date().toISOString(),
      spinId: randomUUID(),
      wheel,
      wheelVersion: version,
      prize,
      prizeIndex,
      spins: Number(finalState.rows[0]?.spins || 0),
      totalSpins: Number(finalState.rows[0]?.total_spins || 0),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    if (transaction) await client.query("ROLLBACK").catch(() => {});
    console.error(error);
    return NextResponse.json({ error: error?.message || "Could not complete Spin Wheel spin." }, { status: 500 });
  } finally {
    client.release();
  }
}
