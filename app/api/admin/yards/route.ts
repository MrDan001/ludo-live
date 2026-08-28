import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import sharp from "sharp";
import { pool, ensureAuthSchema } from "../../auth/_db";

const COOKIE = "ludo_session";
const MIME = new Set(["image/png", "image/webp"]);
const MAX = 4_000_000;
const MIN_DIM = 128;
const MAX_DIM = 4096;
const KINDS = new Set(["background", "sticker"]);
const RARITIES = new Set(["COMMON", "RARE", "EPIC", "LEGENDARY"]);
const CURRENCIES = new Set(["coins", "gems", "naira"]);

async function admin(q: NextRequest) {
  const token = q.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const h = createHash("sha256").update(token).digest("hex");
  const r = await pool.query<any>(
    `SELECT u.* FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id
     WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1`,
    [h],
  );
  const u = r.rows[0];
  if (!u || u.is_guest || u.is_banned) return null;
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  return u.email && allowed.includes(u.email.toLowerCase()) ? u : null;
}

async function schema() {
  await ensureAuthSchema();
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_shop_yards(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    kind TEXT NOT NULL CHECK(kind IN ('background','sticker')),
    rarity TEXT NOT NULL DEFAULT 'COMMON',
    currency TEXT NOT NULL CHECK(currency IN ('coins','gems','naira')),
    price INTEGER NOT NULL CHECK(price>=0),
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    image_data BYTEA NOT NULL,
    image_type TEXT NOT NULL,
    created_by TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}

function row(r: any) {
  return {
    id: r.id, type: "item", name: r.name, description: r.description,
    kind: r.kind, rarity: r.rarity, currency: r.currency, price: Number(r.price),
    isPublished: Boolean(r.is_published),
    imageUrl: `/api/shop/yards/${encodeURIComponent(r.id)}/image?v=${encodeURIComponent(new Date(r.updated_at).getTime())}`,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

async function list() {
  const r = await pool.query(`SELECT * FROM ludo_shop_yards ORDER BY sort_order,created_at DESC`);
  return r.rows.map(row);
}

async function validateArtwork(file: File, kind: string) {
  if (!MIME.has(file.type)) throw Error("Yard artwork must be PNG or WebP.");
  if (file.size < 1 || file.size > MAX) throw Error("Artwork must be smaller than 4 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(bytes).metadata();
  if (!meta.width || !meta.height) throw Error("Could not read artwork dimensions.");
  if (meta.width < MIN_DIM || meta.height < MIN_DIM || meta.width > MAX_DIM || meta.height > MAX_DIM) {
    throw Error(`Artwork dimensions must be between ${MIN_DIM}×${MIN_DIM} and ${MAX_DIM}×${MAX_DIM}px.`);
  }
  if (!meta.hasAlpha && kind === "sticker") {
    throw Error("Backgroundless stickers must contain real transparency (an alpha channel).");
  }
  return { bytes, width: meta.width, height: meta.height, hasAlpha: Boolean(meta.hasAlpha) };
}

function validateFields(name: string, kind: string, rarity: string, currency: string, price: number) {
  if (!name || name.length > 80) throw Error("Name is required and must be 80 characters or fewer.");
  if (!KINDS.has(kind)) throw Error("Choose Background Yard or Backgroundless Sticker.");
  if (!RARITIES.has(rarity) || !CURRENCIES.has(currency) || !Number.isFinite(price) || price < 0) {
    throw Error("Invalid rarity, currency or price.");
  }
}

export async function GET(q: NextRequest) {
  try {
    if (!(await admin(q))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    await schema();
    return NextResponse.json({ ok: true, yards: await list() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unable to load yards." }, { status: 500 });
  }
}

export async function POST(q: NextRequest) {
  try {
    const a = await admin(q);
    if (!a) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    await schema();
    const f = await q.formData();
    const name = String(f.get("name") || "").trim();
    const description = String(f.get("description") || "").trim();
    const kind = String(f.get("kind") || "");
    const rarity = String(f.get("rarity") || "COMMON").toUpperCase();
    const currency = String(f.get("currency") || "coins");
    const price = Math.trunc(Number(f.get("price")));
    const file = f.get("image");
    validateFields(name, kind, rarity, currency, price);
    if (!(file instanceof File)) throw Error("Artwork upload is required.");
    const artwork = await validateArtwork(file, kind);
    const id = `yard-${kind}-${randomUUID()}`;
    const r = await pool.query(
      `INSERT INTO ludo_shop_yards(id,name,description,kind,rarity,currency,price,is_published,sort_order,image_data,image_type,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,TRUE,(SELECT COALESCE(MAX(sort_order),-1)+1 FROM ludo_shop_yards),$8,$9,$10,$11) RETURNING *`,
      [id, name, description, kind, rarity, currency, price, artwork.bytes, file.type, a.id],
    );
    await pool.query(
      `INSERT INTO ludo_admin_actions(admin_user_id,action,target_user_id,details) VALUES($1,'yard_create',NULL,$2)`,
      [a.id, JSON.stringify({ id, name, kind, rarity, currency, price, fileType: file.type, fileBytes: file.size, width: artwork.width, height: artwork.height, hasAlpha: artwork.hasAlpha })],
    );
    return NextResponse.json({ ok: true, yard: row(r.rows[0]), yards: await list() });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Unable to create yard." }, { status: 400 });
  }
}

export async function PATCH(q: NextRequest) {
  try {
    const a = await admin(q);
    if (!a) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    await schema();
    const f = await q.formData();
    const id = String(f.get("id") || "");
    const old = (await pool.query(`SELECT * FROM ludo_shop_yards WHERE id=$1`, [id])).rows[0];
    if (!old) return NextResponse.json({ error: "Yard not found." }, { status: 404 });
    const name = String(f.get("name") ?? old.name).trim();
    const description = String(f.get("description") ?? old.description).trim();
    const rarity = String(f.get("rarity") ?? old.rarity).toUpperCase();
    const currency = String(f.get("currency") ?? old.currency);
    const price = Math.trunc(Number(f.get("price") ?? old.price));
    const published = String(f.get("isPublished") ?? old.is_published) === "true";
    const file = f.get("image");
    validateFields(name, old.kind, rarity, currency, price);

    if (file instanceof File && file.size) {
      const artwork = await validateArtwork(file, old.kind);
      await pool.query(
        `UPDATE ludo_shop_yards SET name=$2,description=$3,rarity=$4,currency=$5,price=$6,is_published=$7,image_data=$8,image_type=$9,updated_at=NOW() WHERE id=$1`,
        [id, name, description, rarity, currency, price, published, artwork.bytes, file.type],
      );
    } else {
      await pool.query(
        `UPDATE ludo_shop_yards SET name=$2,description=$3,rarity=$4,currency=$5,price=$6,is_published=$7,updated_at=NOW() WHERE id=$1`,
        [id, name, description, rarity, currency, price, published],
      );
    }
    await pool.query(
      `INSERT INTO ludo_admin_actions(admin_user_id,action,target_user_id,details) VALUES($1,'yard_update',NULL,$2)`,
      [a.id, JSON.stringify({ id, name, kind: old.kind, replacedArtwork: Boolean(file && file instanceof File && file.size), published })],
    );
    return NextResponse.json({ ok: true, yards: await list() });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Unable to update yard." }, { status: 400 });
  }
}

export async function DELETE(q: NextRequest) {
  try {
    const a = await admin(q);
    if (!a) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    await schema();
    const id = String(q.nextUrl.searchParams.get("id") || "");
    if (!id) return NextResponse.json({ error: "Yard id is required." }, { status: 400 });
    const old = (await pool.query(`DELETE FROM ludo_shop_yards WHERE id=$1 RETURNING id,name,kind`, [id])).rows[0];
    if (!old) return NextResponse.json({ error: "Yard not found." }, { status: 404 });
    await pool.query(
      `INSERT INTO ludo_admin_actions(admin_user_id,action,target_user_id,details) VALUES($1,'yard_delete',NULL,$2)`,
      [a.id, JSON.stringify(old)],
    );
    return NextResponse.json({ ok: true, yards: await list() });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Unable to delete yard." }, { status: 400 });
  }
}
