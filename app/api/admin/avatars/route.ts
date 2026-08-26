import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { pool, ensureAuthSchema } from "../../auth/_db";

const COOKIE = "ludo_session";
const CURRENCIES = ["coins", "gems", "naira"] as const;
const MAX_IMAGE_BYTES = 1_500_000;
const MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

type Currency = (typeof CURRENCIES)[number];

async function admin(q: NextRequest) {
  const token = q.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const result = await pool.query<any>(`SELECT u.* FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1`, [hash]);
  const user = result.rows[0];
  if (!user || user.is_guest || user.is_banned) return null;
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").split(",").map((x: string) => x.trim().toLowerCase()).filter(Boolean);
  return user.email && allowed.includes(user.email.toLowerCase()) ? user : null;
}

async function ensureAvatarSchema() {
  await ensureAuthSchema();
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_avatar_categories(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_shop_avatars(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category_id TEXT REFERENCES ludo_avatar_categories(id) ON DELETE SET NULL,
    rarity TEXT NOT NULL DEFAULT 'COMMON',
    currency TEXT NOT NULL CHECK(currency IN ('coins','gems','naira')),
    price INTEGER NOT NULL CHECK(price>=0),
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    icon TEXT,
    image_data BYTEA,
    image_type TEXT,
    created_by TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const categories = [
    ["classic", "Classic", "classic", "Everyday Ludo avatars."],
    ["heroes", "Heroes", "heroes", "Bold hero-inspired avatars."],
    ["royal", "Royal", "royal", "Premium royal characters."],
    ["fantasy", "Fantasy", "fantasy", "Magic and fantasy characters."],
    ["sports", "Sports", "sports", "Sports and competitive characters."],
    ["funny", "Funny", "funny", "Playful and humorous avatars."],
    ["animals", "Animals", "animals", "Animal and creature avatars."],
    ["seasonal", "Seasonal", "seasonal", "Limited seasonal releases."],
    ["limited", "Limited Edition", "limited", "Rare, time-limited releases."],
  ];
  for (let i = 0; i < categories.length; i++) {
    const [id, name, slug, description] = categories[i];
    await pool.query(`INSERT INTO ludo_avatar_categories(id,name,slug,description,sort_order) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING`, [id, name, slug, description, i]);
  }
}

function rowAvatar(r: any) {
  return {
    id: r.id,
    type: "avatar",
    name: r.name,
    description: r.description,
    categoryId: r.category_id,
    category: r.category_name || null,
    rarity: r.rarity,
    currency: r.currency,
    price: Number(r.price),
    isPublished: Boolean(r.is_published),
    sortOrder: Number(r.sort_order),
    hasImage: Boolean(r.image_data),
    imageUrl: r.image_data ? `/api/shop/avatars/${encodeURIComponent(r.id)}/image` : null,
    icon: r.icon || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function list() {
  const [categories, avatars] = await Promise.all([
    pool.query(`SELECT id,name,slug,description,is_active AS "isActive",sort_order AS "sortOrder" FROM ludo_avatar_categories ORDER BY sort_order,name`),
    pool.query(`SELECT a.*,c.name AS category_name FROM ludo_shop_avatars a LEFT JOIN ludo_avatar_categories c ON c.id=a.category_id ORDER BY a.sort_order,a.created_at DESC`),
  ]);
  return { categories: categories.rows, avatars: avatars.rows.map(rowAvatar) };
}

export async function GET(q: NextRequest) {
  try {
    if (!(await admin(q))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    await ensureAvatarSchema();
    return NextResponse.json({ ok: true, ...(await list()) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unable to load avatar manager." }, { status: 500 });
  }
}

export async function POST(q: NextRequest) {
  try {
    const a = await admin(q);
    if (!a) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    await ensureAvatarSchema();
    const form = await q.formData();
    const name = String(form.get("name") || "").trim();
    const description = String(form.get("description") || "").trim();
    const categoryId = String(form.get("categoryId") || "").trim() || null;
    const rarity = String(form.get("rarity") || "COMMON").trim().toUpperCase();
    const currency = String(form.get("currency") || "") as Currency;
    const price = Math.trunc(Number(form.get("price")));
    const file = form.get("image");
    if (!name || name.length > 80) return NextResponse.json({ error: "Avatar name is required and must be 80 characters or fewer." }, { status: 400 });
    if (!CURRENCIES.includes(currency) || !Number.isFinite(price) || price < 0) return NextResponse.json({ error: "Choose a valid currency and non-negative price." }, { status: 400 });
    if (!file || !(file instanceof File)) return NextResponse.json({ error: "Upload a PNG, JPEG or WebP avatar image." }, { status: 400 });
    if (!MIME_TYPES.has(file.type)) return NextResponse.json({ error: "Only PNG, JPEG and WebP images are supported." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Avatar image must be between 1 byte and 1.5 MB." }, { status: 400 });
    if (categoryId) {
      const c = await pool.query(`SELECT id FROM ludo_avatar_categories WHERE id=$1 AND is_active=TRUE`, [categoryId]);
      if (!c.rowCount) return NextResponse.json({ error: "Avatar category not found or inactive." }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const id = `avatar-${randomUUID()}`;
    const icon = String(form.get("icon") || "").trim() || null;
    const result = await pool.query(`INSERT INTO ludo_shop_avatars(id,name,description,category_id,rarity,currency,price,is_published,icon,image_data,image_type,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,TRUE,$8,$9,$10,$11) RETURNING id,name,description,category_id,rarity,currency,price,is_published,sort_order,icon,created_at,updated_at`, [id,name,description,categoryId,rarity,currency,price,icon,bytes,file.type,a.id]);
    await pool.query(`INSERT INTO ludo_admin_actions(admin_user_id,action,target_user_id,details) VALUES($1,'avatar_create',NULL,$2)`, [a.id, JSON.stringify({ id, name, categoryId, rarity, currency, price, fileType: file.type, fileBytes: file.size })]);
    return NextResponse.json({ ok: true, avatar: rowAvatar(result.rows[0]), ...(await list()) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unable to create avatar." }, { status: 500 });
  }
}

export async function PATCH(q: NextRequest) {
  try {
    const a = await admin(q);
    if (!a) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    await ensureAvatarSchema();
    const body = await q.json().catch(() => ({}));
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "Avatar id is required." }, { status: 400 });
    const existing = await pool.query(`SELECT * FROM ludo_shop_avatars WHERE id=$1`, [id]);
    if (!existing.rowCount) return NextResponse.json({ error: "Avatar not found." }, { status: 404 });
    const name = String(body.name ?? existing.rows[0].name).trim();
    const description = String(body.description ?? existing.rows[0].description).trim();
    const categoryId = body.categoryId === null || body.categoryId === "" ? null : String(body.categoryId);
    const rarity = String(body.rarity ?? existing.rows[0].rarity).trim().toUpperCase();
    const currency = String(body.currency ?? existing.rows[0].currency) as Currency;
    const price = Math.trunc(Number(body.price ?? existing.rows[0].price));
    const isPublished = body.isPublished === undefined ? Boolean(existing.rows[0].is_published) : Boolean(body.isPublished);
    const sortOrder = Math.trunc(Number(body.sortOrder ?? existing.rows[0].sort_order));
    if (!name || !CURRENCIES.includes(currency) || !Number.isFinite(price) || price < 0) return NextResponse.json({ error: "Valid name, currency and price are required." }, { status: 400 });
    if (categoryId) {
      const c = await pool.query(`SELECT id FROM ludo_avatar_categories WHERE id=$1 AND is_active=TRUE`, [categoryId]);
      if (!c.rowCount) return NextResponse.json({ error: "Avatar category not found or inactive." }, { status: 400 });
    }
    const r = await pool.query(`UPDATE ludo_shop_avatars SET name=$2,description=$3,category_id=$4,rarity=$5,currency=$6,price=$7,is_published=$8,sort_order=$9,updated_at=NOW() WHERE id=$1 RETURNING *`, [id,name,description,categoryId,rarity,currency,price,isPublished,Number.isFinite(sortOrder) ? sortOrder : 0]);
    await pool.query(`INSERT INTO ludo_admin_actions(admin_user_id,action,target_user_id,details) VALUES($1,'avatar_update',NULL,$2)`, [a.id, JSON.stringify({ id, name, categoryId, rarity, currency, price, isPublished })]);
    return NextResponse.json({ ok: true, avatar: rowAvatar(r.rows[0]), ...(await list()) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unable to update avatar." }, { status: 500 });
  }
}

export async function DELETE(q: NextRequest) {
  try {
    const a = await admin(q);
    if (!a) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    await ensureAvatarSchema();
    const body = await q.json().catch(() => ({}));
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "Avatar id is required." }, { status: 400 });
    const r = await pool.query(`DELETE FROM ludo_shop_avatars WHERE id=$1 RETURNING id,name`, [id]);
    if (!r.rowCount) return NextResponse.json({ error: "Avatar not found." }, { status: 404 });
    await pool.query(`INSERT INTO ludo_admin_actions(admin_user_id,action,target_user_id,details) VALUES($1,'avatar_delete',NULL,$2)`, [a.id, JSON.stringify(r.rows[0])]);
    return NextResponse.json({ ok: true, deleted: r.rows[0], ...(await list()) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unable to delete avatar." }, { status: 500 });
  }
}
