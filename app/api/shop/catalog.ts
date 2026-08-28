import { pool } from "../auth/_db";
import { CATALOG } from "../../../lib/customization-catalog";

export type ShopCurrency = "coins" | "gems" | "naira";
type ShopPrice = { currency: ShopCurrency; price: number };

const BUILTIN_AVATARS = [
  ["avatar-1", "Avatar 1", "🧑🏽‍🎮", "gems", 500, "RARE"],
  ["avatar-2", "Avatar 2", "👩🏽‍🎤", "gems", 700, "RARE"],
  ["avatar-3", "Avatar 3", "🧔🏾‍♂️", "gems", 1000, "EPIC"],
  ["avatar-4", "Avatar 4", "👨🏽‍🚀", "gems", 1200, "EPIC"],
  ["avatar-5", "Avatar 5", "👩🏾‍🚀", "gems", 1300, "EPIC"],
  ["avatar-6", "Avatar 6", "🧙🏽‍♂️", "gems", 2000, "LEGENDARY"],
] as const;

const YARD_ITEMS = [
  { id: "yard-classic", type: "item" as const, name: "Classic Yard", description: "The original clean yard.", icon: "🏠", currency: "coins" as const, price: 0, rarity: "COMMON" },
  { id: "yard-inferno", type: "item" as const, name: "Inferno Yard", description: "A blazing red-orange yard sticker.", icon: "🔥", currency: "coins" as const, price: 1500, rarity: "EPIC" },
  { id: "yard-galaxy", type: "item" as const, name: "Galaxy Yard", description: "A deep-space yard with cosmic glow.", icon: "🌌", currency: "gems" as const, price: 60, rarity: "LEGENDARY" },
  { id: "yard-royal", type: "item" as const, name: "Royal Yard", description: "A premium gold-and-crown yard.", icon: "👑", currency: "gems" as const, price: 75, rarity: "LEGENDARY" },
  { id: "yard-ocean", type: "item" as const, name: "Ocean Yard", description: "A cool blue aquatic yard.", icon: "🌊", currency: "coins" as const, price: 1200, rarity: "RARE" },
  { id: "yard-sakura", type: "item" as const, name: "Sakura Yard", description: "A soft pink blossom yard.", icon: "🌸", currency: "coins" as const, price: 1400, rarity: "EPIC" },
  { id: "yard-shadow", type: "item" as const, name: "Shadow Yard", description: "A dark stealth-style yard.", icon: "🖤", currency: "gems" as const, price: 55, rarity: "EPIC" },
  { id: "yard-neon", type: "item" as const, name: "Neon Yard", description: "A bright arcade-style yard.", icon: "⚡", currency: "gems" as const, price: 65, rarity: "EPIC" },
] as const;

async function ensureAvatarCatalogue() {
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_avatar_categories(id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,slug TEXT NOT NULL UNIQUE,description TEXT NOT NULL DEFAULT '',is_active BOOLEAN NOT NULL DEFAULT TRUE,sort_order INTEGER NOT NULL DEFAULT 0,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_shop_avatars(id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',category_id TEXT REFERENCES ludo_avatar_categories(id) ON DELETE SET NULL,rarity TEXT NOT NULL DEFAULT 'COMMON',currency TEXT NOT NULL CHECK(currency IN ('coins','gems','naira')),price INTEGER NOT NULL CHECK(price>=0),is_published BOOLEAN NOT NULL DEFAULT TRUE,sort_order INTEGER NOT NULL DEFAULT 0,icon TEXT,image_data BYTEA,image_type TEXT,created_by TEXT,is_builtin BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`ALTER TABLE ludo_shop_avatars ADD COLUMN IF NOT EXISTS is_builtin BOOLEAN NOT NULL DEFAULT FALSE`);
  const categories = [["classic","Classic","classic","Everyday Ludo avatars."],["heroes","Heroes","heroes","Bold hero-inspired avatars."],["royal","Royal","royal","Premium royal characters."],["fantasy","Fantasy","fantasy","Magic and fantasy characters."],["sports","Sports","sports","Sports and competitive characters."],["animals","Animals","animals","Animal and creature avatars."],["funny","Funny","funny","Playful and humorous avatars."],["seasonal","Seasonal","seasonal","Limited seasonal releases."],["limited","Limited Edition","limited","Rare, time-limited releases."]];
  for (let i=0;i<categories.length;i++) { const [id,name,slug,description]=categories[i]; await pool.query(`INSERT INTO ludo_avatar_categories(id,name,slug,description,sort_order) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING`,[id,name,slug,description,i]); }
  for (const [id,name,icon,currency,price,rarity] of BUILTIN_AVATARS) await pool.query(`INSERT INTO ludo_shop_avatars(id,name,description,category_id,rarity,currency,price,is_published,icon,is_builtin) VALUES($1,$2,'Built-in Ludo avatar.','classic',$3,$4,$5,TRUE,$6,TRUE) ON CONFLICT(id) DO UPDATE SET is_builtin=TRUE,icon=EXCLUDED.icon,category_id=COALESCE(ludo_shop_avatars.category_id,'classic'),updated_at=NOW()`,[id,name,rarity,currency,price,icon]);
}

async function dynamicAvatars() {
  try {
    await ensureAvatarCatalogue();
    const result = await pool.query<any>(`SELECT a.id,a.name,a.description,a.category_id,c.name AS category_name,a.rarity,a.currency,a.price,a.is_published,a.sort_order,a.icon,a.is_builtin,a.image_data IS NOT NULL AS has_image,a.updated_at FROM ludo_shop_avatars a LEFT JOIN ludo_avatar_categories c ON c.id=a.category_id WHERE a.is_published=TRUE AND (c.is_active=TRUE OR a.category_id IS NULL) ORDER BY a.sort_order,a.created_at DESC`);
    return result.rows.map((r:any)=>({id:r.id,type:"avatar" as const,name:r.name,description:r.description||"",categoryId:r.category_id||null,category:r.category_name||null,rarity:r.rarity,currency:r.currency as ShopCurrency,price:Number(r.price),icon:r.icon||"🧑‍🎮",imageUrl:r.has_image?`/api/shop/avatars/${encodeURIComponent(r.id)}/image?v=${encodeURIComponent(new Date(r.updated_at).getTime())}`:null,isBuiltin:Boolean(r.is_builtin),sortOrder:Number(r.sort_order)}));
  } catch(error) { console.error("Dynamic avatar lookup failed",error); return []; }
}

export async function getShopCatalog() {
  let overrides=new Map<string,ShopPrice>();
  try { const result=await pool.query<{item_type:string;item_id:string;currency:ShopCurrency;price:string|number}>("SELECT item_type,item_id,currency,price FROM ludo_shop_catalog_overrides"); overrides=new Map(result.rows.map(r=>[`${r.item_type}:${r.item_id}`,{currency:r.currency,price:Number(r.price)}])); } catch(error:any) { if(error?.code!=="42P01") console.error("Shop override lookup failed",error); }
  const staticItems=[...CATALOG.filter((item:any)=>item.type!=="avatar"),...YARD_ITEMS].map((item:any)=>{const override=overrides.get(`${item.type}:${item.id}`);return override?{...item,...override}:item;});
  return [...staticItems,...await dynamicAvatars()];
}

export async function getShopItem(type:string,id:string) { const catalog=await getShopCatalog(); return catalog.find((item:any)=>item.type===type&&item.id===id)||null; }
