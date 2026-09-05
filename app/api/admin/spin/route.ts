import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SPIN_WHEEL, SPIN_SLOT_COUNT, cleanSpinSlot, isSpinKind, type SpinWheelSlot } from "../../../../lib/spinWheel";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { getShopCatalog } from "../../shop/catalog";

const COOKIE = "ludo_session";

async function getAdmin(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const result = await pool.query<any>(
    `SELECT u.* FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1`,
    [hash],
  );
  const user = result.rows[0];
  if (!user || user.is_guest || user.is_banned) return null;
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return user.email && allowed.includes(String(user.email).toLowerCase()) ? user : null;
}

async function ensureSchema() {
  await ensureAuthSchema();
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_spin_wheel_slots(
    slot INTEGER PRIMARY KEY CHECK(slot BETWEEN 0 AND 7),
    id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('coins','gems','extraSpin','shop_item')),
    label TEXT NOT NULL,
    icon TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    probability NUMERIC NOT NULL DEFAULT 1,
    item_type TEXT,
    item_id TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  for (const reward of DEFAULT_SPIN_WHEEL) {
    await pool.query(
      `INSERT INTO ludo_spin_wheel_slots(slot,id,kind,label,icon,amount,probability,item_type,item_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(slot) DO NOTHING`,
      [reward.slot, reward.id, reward.kind, reward.label, reward.icon, reward.amount, reward.probability, reward.itemType || null, reward.itemId || null],
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAdmin(request);
    if (!user) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    await ensureSchema();
    const catalog = await getShopCatalog();
    const result = await pool.query(
      `SELECT slot,id,kind,label,icon,amount,probability,item_type AS "itemType",item_id AS "itemId",updated_at AS "updatedAt"
       FROM ludo_spin_wheel_slots ORDER BY slot ASC`,
    );
    const rewards = result.rows.map((row: any) => ({ ...row, amount: Number(row.amount), probability: Number(row.probability) }));
    return NextResponse.json(
      { slotCount: SPIN_SLOT_COUNT, rewards, catalog: catalog.filter((item: any) => ["board", "dice", "avatar", "item"].includes(item.type)) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load Spin Wheel configuration." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  let transaction = false;
  try {
    const user = await getAdmin(request);
    if (!user) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    await ensureSchema();
    const body = await request.json().catch(() => ({}));
    const slotNumber = Number(body.slot);
    if (!Number.isInteger(slotNumber) || slotNumber < 0 || slotNumber >= SPIN_SLOT_COUNT) {
      return NextResponse.json({ error: "Spin slot must be between 1 and 8." }, { status: 400 });
    }
    if (!isSpinKind(body.kind)) return NextResponse.json({ error: "Invalid Spin reward type." }, { status: 400 });

    const reward = cleanSpinSlot({ ...body, id: `slot-${slotNumber + 1}` }, slotNumber);
    if (reward.probability <= 0) return NextResponse.json({ error: "Probability / weight must be greater than 0." }, { status: 400 });
    if ((reward.kind === "coins" || reward.kind === "gems" || reward.kind === "extraSpin") && reward.amount < 1) {
      return NextResponse.json({ error: "Amount must be at least 1 for this reward type." }, { status: 400 });
    }
    if (reward.kind === "shop_item" && (!reward.itemType || !reward.itemId)) {
      return NextResponse.json({ error: "Select a Shop item for this slot." }, { status: 400 });
    }

    if (reward.kind === "shop_item") {
      const catalog = await getShopCatalog();
      const item = catalog.find((entry: any) => entry.type === reward.itemType && entry.id === reward.itemId);
      if (!item) return NextResponse.json({ error: "Selected Shop item was not found." }, { status: 404 });
    }

    await client.query("BEGIN");
    transaction = true;
    await client.query(
      `UPDATE ludo_spin_wheel_slots
       SET id=$1,kind=$2,label=$3,icon=$4,amount=$5,probability=$6,item_type=$7,item_id=$8,updated_at=NOW()
       WHERE slot=$9`,
      [reward.id, reward.kind, reward.label, reward.icon, reward.amount, reward.probability, reward.itemType, reward.itemId, reward.slot],
    );
    await client.query(
      `INSERT INTO ludo_admin_actions(admin_user_id,action,target_user_id,details) VALUES($1,'spin_wheel_slot_update',NULL,$2)`,
      [user.id, JSON.stringify({ slot: reward.slot + 1, reward })],
    );
    await client.query("COMMIT");
    transaction = false;

    return NextResponse.json({ ok: true, slot: reward.slot, reward });
  } catch (error: any) {
    if (transaction) await client.query("ROLLBACK").catch(() => {});
    console.error(error);
    return NextResponse.json({ error: error?.message || "Unable to save Spin Wheel slot." }, { status: 500 });
  } finally {
    client.release();
  }
}
