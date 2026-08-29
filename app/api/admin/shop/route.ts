import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { getShopCatalog, ShopCurrency } from "../../shop/catalog";

const COOKIE = "ludo_session";

async function admin(q: NextRequest) {
  const token = q.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const r = await pool.query<any>(`SELECT u.* FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1`, [hash]);
  const u = r.rows[0];
  if (!u || u.is_guest || u.is_banned) return null;
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").split(",").map((x: string) => x.trim().toLowerCase()).filter(Boolean);
  return u.email && allowed.includes(u.email.toLowerCase()) ? u : null;
}

async function ensureShopTable() {
  await ensureAuthSchema();
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_shop_catalog_overrides(item_type TEXT NOT NULL,item_id TEXT NOT NULL,currency TEXT NOT NULL CHECK(currency IN ('coins','gems','naira')),price INTEGER NOT NULL CHECK(price>=0),required_level INTEGER NOT NULL DEFAULT 0,stock_quantity INTEGER NOT NULL DEFAULT -1,is_active BOOLEAN NOT NULL DEFAULT TRUE,image_url TEXT,category TEXT,updated_by TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(item_type,item_id))`);
  await pool.query("ALTER TABLE ludo_shop_catalog_overrides ADD COLUMN IF NOT EXISTS required_level INTEGER NOT NULL DEFAULT 0");
  await pool.query("ALTER TABLE ludo_shop_catalog_overrides ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT -1");
  await pool.query("ALTER TABLE ludo_shop_catalog_overrides ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE");
  await pool.query("ALTER TABLE ludo_shop_catalog_overrides ADD COLUMN IF NOT EXISTS image_url TEXT");
  await pool.query("ALTER TABLE ludo_shop_catalog_overrides ADD COLUMN IF NOT EXISTS category TEXT");
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_shop_visual_items(id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',kind TEXT NOT NULL CHECK(kind IN ('background','sticker')),rarity TEXT NOT NULL DEFAULT 'COMMON',currency TEXT NOT NULL CHECK(currency IN ('coins','gems','naira')),price INTEGER NOT NULL CHECK(price>=0),stock_quantity INTEGER NOT NULL DEFAULT -1,required_level INTEGER NOT NULL DEFAULT 0,image_url TEXT,icon TEXT NOT NULL DEFAULT '✨',is_published BOOLEAN NOT NULL DEFAULT TRUE,sort_order INTEGER NOT NULL DEFAULT 0,created_by TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
}

async function pricingUpdatedAt() {
  const r = await pool.query<{updated_at:string|null}>(`SELECT MAX(updated_at) AS updated_at FROM ludo_shop_catalog_overrides`);
  return r.rows[0]?.updated_at || null;
}

export async function GET(q: NextRequest) {
  try {
    const a = await admin(q);
    if (!a) return NextResponse.json({error:"Admin access required."},{status:403});
    await ensureShopTable();
    const [items, visuals] = await Promise.all([
      getShopCatalog(),
      pool.query(`SELECT id,name,description,kind,rarity,currency,price,stock_quantity,required_level,image_url,icon,is_published,sort_order,created_at,updated_at FROM ludo_shop_visual_items ORDER BY sort_order,created_at DESC`)
    ]);
    return NextResponse.json({ok:true,items,visualItems:visuals.rows,lastUpdated:await pricingUpdatedAt()},{headers:{"Cache-Control":"no-store,no-cache,must-revalidate","Pragma":"no-cache","Expires":"0"}});
  } catch(e) {
    console.error(e);
    return NextResponse.json({error:"Unable to load shop configuration."},{status:500});
  }
}

export async function POST(q: NextRequest) {
  try {
    const a = await admin(q);
    if (!a) return NextResponse.json({error:"Admin access required."},{status:403});
    await ensureShopTable();
    const body = await q.json().catch(()=>({}));
    const action = String(body.action || "save");

    if (action === "create_visual" || action === "edit_visual") {
      const id = String(body.id || `shop-${Date.now()}`);
      const name = String(body.name || "New shop item").trim();
      const description = String(body.description || "").trim();
      const kind = body.kind === "sticker" ? "sticker" : "background";
      const rarity = String(body.rarity || "COMMON").toUpperCase();
      const currency = String(body.currency || "coins") as ShopCurrency;
      const price = Math.trunc(Number(body.price));
      const stock = body.stockQuantity === "" || body.stockQuantity === undefined ? -1 : Math.trunc(Number(body.stockQuantity));
      const requiredLevel = Math.max(0, Math.trunc(Number(body.requiredLevel) || 0));
      const imageUrl = String(body.imageUrl || "").trim() || null;
      const icon = String(body.icon || (kind === "sticker" ? "✨" : "🏠"));
      if (!name || !["coins","gems","naira"].includes(currency) || !Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || stock < -1) return NextResponse.json({error:"Enter a valid name, currency, price and stock (-1 means unlimited)."},{status:400});
      await pool.query(`INSERT INTO ludo_shop_visual_items(id,name,description,kind,rarity,currency,price,stock_quantity,required_level,image_url,icon,is_published,created_by,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE,$12,NOW()) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,kind=EXCLUDED.kind,rarity=EXCLUDED.rarity,currency=EXCLUDED.currency,price=EXCLUDED.price,stock_quantity=EXCLUDED.stock_quantity,required_level=EXCLUDED.required_level,image_url=EXCLUDED.image_url,icon=EXCLUDED.icon,is_published=TRUE,updated_at=NOW()`,[id,name,description,kind,rarity,currency,price,stock,requiredLevel,imageUrl,icon,a.id]);
      await pool.query(`INSERT INTO ludo_admin_actions(admin_user_id,action,target_user_id,details) VALUES($1,'shop_visual_item_save',NULL,$2)`,[a.id,JSON.stringify({id,name,kind,currency,price,stock,requiredLevel})]);
      return NextResponse.json({ok:true,id});
    }

    if (action === "delete_visual") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({error:"Item id is required."},{status:400});
      await pool.query(`UPDATE ludo_shop_visual_items SET is_published=FALSE,updated_at=NOW() WHERE id=$1`,[id]);
      await pool.query(`INSERT INTO ludo_admin_actions(admin_user_id,action,target_user_id,details) VALUES($1,'shop_visual_item_delete',NULL,$2)`,[a.id,JSON.stringify({id})]);
      return NextResponse.json({ok:true});
    }

    if (action === "toggle_visual") {
      const id = String(body.id || "");
      await pool.query(`UPDATE ludo_shop_visual_items SET is_published=NOT is_published,updated_at=NOW() WHERE id=$1`,[id]);
      return NextResponse.json({ok:true});
    }

    const type = String(body.type||"");
    const id = String(body.id||"");
    const currency = String(body.currency||"") as ShopCurrency;
    const price = Math.trunc(Number(body.price));
    const requiredLevel = body.requireLevel === false ? 0 : Math.max(0,Math.trunc(Number(body.requiredLevel)||0));
    const stock = body.stockQuantity === "" || body.stockQuantity === undefined ? -1 : Math.trunc(Number(body.stockQuantity));
    const isActive = body.isActive !== false;
    const imageUrl = String(body.imageUrl || "").trim() || null;
    const category = String(body.category || "").trim() || null;
    if (!type || !id || !["coins","gems","naira"].includes(currency) || !Number.isFinite(price) || price<0 || !Number.isFinite(stock) || stock < -1) return NextResponse.json({error:"Valid item, currency, price and stock are required."},{status:400});
    const catalog = await getShopCatalog();
    const item:any = catalog.find((x:any)=>x.type===type&&x.id===id);
    if (!item) return NextResponse.json({error:"Shop item not found."},{status:404});
    await pool.query(`INSERT INTO ludo_shop_catalog_overrides(item_type,item_id,currency,price,required_level,stock_quantity,is_active,image_url,category,updated_by,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) ON CONFLICT(item_type,item_id) DO UPDATE SET currency=EXCLUDED.currency,price=EXCLUDED.price,required_level=EXCLUDED.required_level,stock_quantity=EXCLUDED.stock_quantity,is_active=EXCLUDED.is_active,image_url=EXCLUDED.image_url,category=EXCLUDED.category,updated_by=EXCLUDED.updated_by,updated_at=NOW()`,[type,id,currency,price,requiredLevel,stock,isActive,imageUrl,category,a.id]);
    await pool.query(`INSERT INTO ludo_admin_actions(admin_user_id,action,target_user_id,details) VALUES($1,'shop_config_update',NULL,$2)`,[a.id,JSON.stringify({type,id,currency,price,requiredLevel,stock,isActive,imageUrl,category,previousCurrency:item.currency,previousPrice:item.price,previousRequiredLevel:item.requiredLevel||0})]);
    return NextResponse.json({ok:true,item:{...item,currency,price,requiredLevel,stockQuantity:stock,isActive,imageUrl,category},lastUpdated:await pricingUpdatedAt()});
  } catch(e) {
    console.error(e);
    return NextResponse.json({error:"Unable to save Shop configuration."},{status:500});
  }
}
