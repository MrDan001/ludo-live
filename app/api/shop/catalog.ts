import { pool, ensureAuthSchema } from "../auth/_db";
import { CATALOG } from "../../../lib/customization-catalog";

export type ShopCurrency = "coins" | "gems" | "naira";

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

export async function getShopCatalog() {
  await ensureShopTable();
  const result = await pool.query<any>("SELECT item_type,item_id,currency,price FROM ludo_shop_catalog_overrides");
  const overrides = new Map(result.rows.map((r:any) => [`${r.item_type}:${r.item_id}`, { currency: r.currency as ShopCurrency, price: Number(r.price) }]));
  return CATALOG.map((item:any) => {
    const override = overrides.get(`${item.type}:${item.id}`);
    return override ? { ...item, currency: override.currency, price: override.price } : item;
  });
}

export async function getShopItem(type:string,id:string) {
  const catalog = await getShopCatalog();
  return catalog.find((item:any) => item.type === type && item.id === id) || null;
}
