import { pool } from "../auth/_db";
import { CATALOG } from "../../../lib/customization-catalog";

export type ShopCurrency = "coins" | "gems" | "naira";

type ShopPrice = { currency: ShopCurrency; price: number };

export async function getShopCatalog() {
  // The catalogue is code-owned and must remain available even if the optional
  // admin override table is unavailable. Never run schema migrations here.
  try {
    const result = await pool.query<{ item_type: string; item_id: string; currency: ShopCurrency; price: string | number }>(
      "SELECT item_type,item_id,currency,price FROM ludo_shop_catalog_overrides"
    );
    const overrides = new Map<string, ShopPrice>(result.rows.map((r) => [
      `${r.item_type}:${r.item_id}`,
      { currency: r.currency, price: Number(r.price) },
    ]));
    return CATALOG.map((item: any) => {
      const override = overrides.get(`${item.type}:${item.id}`);
      return override ? { ...item, currency: override.currency, price: override.price } : item;
    });
  } catch (error: any) {
    // 42P01 = undefined_table. The static catalogue is still valid and should
    // be returned rather than making the Shop appear empty.
    if (error?.code !== "42P01") console.error("Shop override lookup failed", error);
    return CATALOG;
  }
}

export async function getShopItem(type: string, id: string) {
  const catalog = await getShopCatalog();
  return catalog.find((item: any) => item.type === type && item.id === id) || null;
}
