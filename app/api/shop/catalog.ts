import { pool, ensureAuthSchema } from "../auth/_db";
import { CATALOG } from "../../../lib/customization-catalog";

export type ShopCurrency = "coins" | "gems" | "naira";

export async function getShopCatalog() {
  await ensureAuthSchema();
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
