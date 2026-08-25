import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { getShopCatalog, ShopCurrency } from "../../shop/catalog";

const COOKIE = "ludo_session";

async function admin(q: NextRequest) {
  const token = q.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const result = await pool.query<any>(`SELECT u.* FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1`, [hash]);
  const user = result.rows[0];
  if (!user || user.is_guest || user.is_banned) return null;
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").split(",").map((x:string) => x.trim().toLowerCase()).filter(Boolean);
  return user.email && allowed.includes(user.email.toLowerCase()) ? user : null;
}

async function ensureShopTable() {
  await ensureAuthSchema();
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_shop_catalog_overrides(
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    currency TEXT NOT NULL CHECK(currency IN ('coins','gems','naira')),
    price INTEGER NOT NULL CHECK(price>=0),
    updated_by TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(item_type,item_id)
  )`);
}

async function pricingUpdatedAt() {
  const r = await pool.query<{ updated_at: string | null }>(`SELECT MAX(updated_at) AS updated_at FROM ludo_shop_catalog_overrides`);
  return r.rows[0]?.updated_at || null;
}

export async function GET(q: NextRequest) {
  try {
    const a = await admin(q);
    if (!a) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    await ensureShopTable();
    return NextResponse.json({ ok: true, items: await getShopCatalog(), lastUpdated: await pricingUpdatedAt() }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache", "Expires": "0" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unable to load shop pricing." }, { status: 500 });
  }
}

export async function POST(q: NextRequest) {
  try {
    const a = await admin(q);
    if (!a) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    await ensureShopTable();
    const body = await q.json().catch(() => ({}));
    const type = String(body.type || "");
    const id = String(body.id || "");
    const currency = String(body.currency || "") as ShopCurrency;
    const price = Math.trunc(Number(body.price));
    if (!type || !id || !["coins","gems","naira"].includes(currency) || !Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Valid item, currency and non-negative price are required." }, { status: 400 });
    }
    const catalog = await getShopCatalog();
    const item = catalog.find((x:any) => x.type === type && x.id === id);
    if (!item) return NextResponse.json({ error: "Shop item not found." }, { status: 404 });
    await pool.query(`INSERT INTO ludo_shop_catalog_overrides(item_type,item_id,currency,price,updated_by,updated_at)
      VALUES($1,$2,$3,$4,$5,NOW()) ON CONFLICT(item_type,item_id) DO UPDATE SET currency=EXCLUDED.currency,price=EXCLUDED.price,updated_by=EXCLUDED.updated_by,updated_at=NOW()`, [type,id,currency,price,a.id]);
    await pool.query(`INSERT INTO ludo_admin_actions(admin_user_id,action,target_user_id,details) VALUES($1,'shop_price_update',NULL,$2)`, [a.id, JSON.stringify({type,id,currency,price,previousCurrency:item.currency,previousPrice:item.price})]);
    return NextResponse.json({ ok: true, item: { ...item, currency, price }, lastUpdated: await pricingUpdatedAt() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unable to save shop price." }, { status: 500 });
  }
}
