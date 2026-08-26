import { pool } from "../auth/_db";
import { CATALOG, AVATARS } from "../../../lib/customization-catalog";

export type ShopCurrency = "coins" | "gems" | "naira";
type ShopPrice = { currency: ShopCurrency; price: number };

async function dynamicAvatars() {
  try {
    const result = await pool.query<any>(`SELECT a.id,a.name,a.description,a.category_id,c.name AS category_name,a.rarity,a.currency,a.price,a.is_published,a.sort_order,a.icon,a.image_data IS NOT NULL AS has_image FROM ludo_shop_avatars a LEFT JOIN ludo_avatar_categories c ON c.id=a.category_id WHERE a.is_published=TRUE ORDER BY a.sort_order,a.created_at DESC`);
    return result.rows.map((r: any) => ({
      id: r.id, type: "avatar" as const, name: r.name, description: r.description || "", categoryId: r.category_id || null,
      category: r.category_name || null, rarity: r.rarity, currency: r.currency as ShopCurrency, price: Number(r.price),
      icon: r.icon || "🧑‍🎮", imageUrl: r.has_image ? `/api/shop/avatars/${encodeURIComponent(r.id)}/image` : null,
    }));
  } catch (error: any) {
    if (error?.code !== "42P01") console.error("Dynamic avatar lookup failed", error);
    return [];
  }
}

export async function getShopCatalog() {
  let overrides = new Map<string, ShopPrice>();
  try {
    const result = await pool.query<{ item_type: string; item_id: string; currency: ShopCurrency; price: string | number }>("SELECT item_type,item_id,currency,price FROM ludo_shop_catalog_overrides");
    overrides = new Map(result.rows.map((r) => [`${r.item_type}:${r.item_id}`, { currency: r.currency, price: Number(r.price) }]));
  } catch (error: any) {
    if (error?.code !== "42P01") console.error("Shop override lookup failed", error);
  }
  const staticItems = CATALOG.filter((item: any) => item.type !== "avatar").map((item: any) => {
    const override = overrides.get(`${item.type}:${item.id}`); return override ? { ...item, ...override } : item;
  });
  const staticAvatars = AVATARS.map((item: any) => ({ ...item, type: "avatar", categoryId: item.categoryId || "classic", category: item.category || "Classic", imageUrl: null }));
  const dynamic = await dynamicAvatars();
  return [...staticItems, ...staticAvatars, ...dynamic];
}

export async function getShopItem(type: string, id: string) {
  const catalog = await getShopCatalog();
  return catalog.find((item: any) => item.type === type && item.id === id) || null;
}
